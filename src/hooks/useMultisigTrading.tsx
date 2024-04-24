import { CoreListing } from '@/hooks/useListings'
import { AsMultiParams } from '@/types/ListingsTypes'
import {
  calculateMultisigAddress,
  getAllOpenMultisigCalls,
  getEncodedAddress,
} from '@/utils/multisigHelper'
import { BN } from '@polkadot/util'
import {
  blake2AsHex,
  createKeyMulti,
  decodeAddress,
  sortAddresses,
  xxhashAsHex,
} from '@polkadot/util-crypto'
import { useInkathon } from '@poppyseed/lastic-sdk'
import { useEffect, useState } from 'react'

const LEGACY_ASMULTI_PARAM_LENGTH = 6
const MAX_WEIGHT = {
  refTime: 12000000, // 6096943 was reftime in test scenario for remark tx
  proofSize: 0,
}

const THRESHOLD = 2 // always 2 out of 3 signatories
const LASTIC_ADDRESS = process.env.NEXT_PUBLIC_LASTIC_ADDRESS || '' // used for new multisigs and if db has no other address defined

export const useMultisigTrading = (
  sellerAddress: string,
  buyerAddress: string,
  core: CoreListing,
) => {
  const { api, activeSigner, activeAccount, activeChain, activeRelayChain } = useInkathon()
  const [isLoading, setIsLoading] = useState(false)
  const [txStatusMessage, setTxStatusMessage] = useState<string>('')

  useEffect(() => {
    setTxStatusMessage('')
  }, [core])

  const signatories = [sellerAddress, buyerAddress, LASTIC_ADDRESS]
  const multisigAddress = calculateMultisigAddress(THRESHOLD, signatories, activeChain)

  const initiateOrExecuteMultisigTradeCall = async (): Promise<void> => {
    if (!_basicChecks()) return
    let when = undefined

    // get latest open multisig call
    // if there is 1 open multisig call -> execute the trade (add 'when')
    // if there is no open multisig call -> create a new one (no 'when')
    // if there are more than 1 open multisig calls -> find the right one and execute it (hard)
    const openMultisigCalls = await getAllOpenMultisigCalls(
      multisigAddress || '',
      api,
      activeRelayChain,
    )

    if (openMultisigCalls && openMultisigCalls?.length === 1) {
      when = openMultisigCalls[0].when
    } else if (openMultisigCalls && openMultisigCalls?.length > 1) {
      // TODO find the right open multisig call to execute. Suggestion: Use timepoint stored in DB.
    }

    // TODO replace with batch call
    const remarkTx = api!.tx.system.remark(`Lastic multisig creation5`)

    // Batch example
    /* const txs = [
      api.tx.balances.transfer(addrBob, 12345),
      api.tx.balances.transfer(addrEve, 12345),
      api.tx.staking.unbond(12345),
    ]

    // construct the batch and send the transactions
    api.tx.utility.batch(txs).signAndSend(sender, ({ status }) => {
      if (status.isInBlock) {
        console.log(`included in ${status.asInBlock}`)
      }
    }) */

    // create the multisig call
    const asMultiTx = getAsMultiTx({
      tx: remarkTx,
      when,
    })

    if (!asMultiTx) {
      console.error('Error in creating the multisig call')
      return
    }
    try {
      setIsLoading(true)
      const unsub = await asMultiTx.signAndSend(
        activeAccount!.address,
        { signer: activeSigner },
        (result) => {
          setTxStatusMessage(result.status.type)
          if (result.status.isInBlock) {
            console.log(`Transaction included at blockHash ${result.status.asInBlock}`)
            console.log('Tx hash: ' + result.txHash)
            setTxStatusMessage(`🧊 Multisig call included in block ${result.status.asInBlock}`)
          } else if (result.status.isFinalized) {
            setTxStatusMessage(`📜 Multisig call finalized ${result.status.asFinalized}`)
            // TODO: If new initiate, Fetch timepoint and update in db. Enables to have multiple trades in same address at once.
            unsub()
          }
        },
      )
    } catch (error: unknown) {
      if (error instanceof Error) setTxStatusMessage('Multisig call: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const getAsMultiTx = ({ tx, when }: AsMultiParams) => {
    if (!api || !activeAccount) return
    const otherSignatories = sortAddresses(
      signatories.filter((sig) => sig !== activeAccount!.address),
    )
    return api.tx.multisig.asMulti.meta.args.length === LEGACY_ASMULTI_PARAM_LENGTH
      ? api.tx.multisig.asMulti(THRESHOLD, otherSignatories, when || null, tx, false, MAX_WEIGHT)
      : api.tx.multisig.asMulti(THRESHOLD, otherSignatories, when || null, tx, MAX_WEIGHT)
  }

  /** Sends the core to the multisig address
   * @param core - The core listed to trade
   */
  const sendCoreToMultisig = async (core: CoreListing) => {
    if (!_basicChecks()) return
    const tx = api?.tx.broker.transfer(
      { begin: core.begin, core: core.coreNumber, mask: core.mask },
      multisigAddress,
    )
    try {
      tx?.signAndSend(activeAccount!.address, { signer: activeSigner }, (result) => {
        setTxStatusMessage(result.status.type)
        if (result.status.isInBlock) {
          console.log(`Transaction included at blockHash ${result.status.asInBlock}`)
          console.log('Tx hash: ' + result.txHash)
          setTxStatusMessage(`🧊 Core sent and tx included in block ${result.status.asInBlock}`)
        } else if (result.status.isFinalized) {
          setTxStatusMessage(`📜 Core sent and tx finalized ${result.status.asFinalized}`)
        }
      })
    } catch (error: unknown) {
      if (error instanceof Error) setTxStatusMessage('Error sending the core: ' + error.message)
    }
  }

  /** Sends the funds to the multisig address
   * @param corePrice - The price of the listed core
   */
  const sendFundsToMultisig = async (corePrice: BN) => {
    if (!_basicChecks()) return
    // simple transfer logic
    const transfer = api?.tx.balances.transfer(multisigAddress, corePrice.toString())

    transfer?.signAndSend(activeAccount!.address, { signer: activeSigner }, (result) => {
      setTxStatusMessage(result.status.type)
      if (result.status.isInBlock) {
        console.log(`Transaction included at blockHash ${result.status.asInBlock}`)
        console.log('Tx hash: ' + result.txHash)
        setTxStatusMessage(`🧊 Funds sent and tx included in block ${result.status.asInBlock}`)
      } else if (result.status.isFinalized) {
        setTxStatusMessage(`📜 Funds sent and tx finalized ${result.status.asFinalized}`)
        // TODO if tx successful, track in db. Add multisig signers and that trade is in progress
      }
    })
  }

  const _basicChecks = () => {
    if (!api || !activeSigner || !activeAccount || !activeChain) {
      console.error('Error in initializing the API')
      return false
    }
    if (!signatories.includes(activeAccount.address)) {
      console.error('Selected account not part of signatories')
      return false
    }
    if (THRESHOLD < 2) {
      console.error('Threshold must be at least 2')
      return false
    }
    return true
  }

  /**
   * The following function is used to get the block number and index of a multisig call via accessing the state storage directly. It is currently not completely functional.
   * @remarks
   * It reads the rpc storage directly to get the multisig call information. The same is done by the PJS team here: https://github.com/paritytech/txwrapper-core/blob/768bb445beb2907582b2d5e13ade3be5d995af3e/packages/txwrapper-examples/multisig/src/multisig.ts#L171
   * This function works but the Subsquid query provides a wrong 'callHash' so the created storageKey is wrong. So use the other functions above to get the multisig call information for now.
   */
  const _getMultisigTimepointByStorageRead = async () => {
    const multisigAddressBytes = createKeyMulti(signatories, THRESHOLD)
    const multisigAddress = getEncodedAddress(multisigAddressBytes, activeChain)

    // 1. Creating the Storage key of our Multisig Storage item following the schema below :
    // Twox128("Multisig") + Twox128("Multisigs") + Twox64(multisigAddress) + multisigAddress + Blake128(multisigCallHash) + multisigCallHash
    const multisigModuleHash = xxhashAsHex('Multisig', 128)
    const multisigStorageHash = xxhashAsHex('Multisigs', 128)
    const multisigCall = '0xc444aa35ff6443f8c3a7c256c32656e934db465e4cd1220d476f592603733394' // TODO find a way to fetch it somewhere

    const multisigAddressHash = xxhashAsHex(decodeAddress(multisigAddress), 64)
    const multisigCallHash = blake2AsHex(multisigCall, 128)
    const multisigAddressInHex = Buffer.from(multisigAddressBytes).toString('hex')

    const multisigStorageKey =
      multisigModuleHash +
      multisigStorageHash.substring(2) +
      multisigAddressHash.substring(2) +
      multisigAddressInHex +
      multisigCallHash.substring(2) +
      multisigCall.substring(2)

    // correct storage key
    /* console.log(
      '0x7474449cca95dc5d0c00e71735a6d17d3cd15a3fd6e04e47bee3922dbfa92c8dbdbba0c80974cc914e19f599aa928e59b47b76460bc3537a8fbbaa2cff932addbefe18876fb32c7e46d861b81bed59335506089328585a33c444aa35ff6443f8c3a7c256c32656e934db465e4cd1220d476f592603733394',
    ) */
    // generated storage key
    // console.log(multisigStorageKey)

    // 2. Making an RPC request with the `state_getStorage` endpoint to retrieve the SCALE-encoded Multisig storage data from the chain under the key `multisigStorageKey`.
    const multisigStorage = await api?.rpc.state.getStorage(multisigStorageKey)
    console.log('Multisig storage: ', multisigStorage)

    // 3. Creating the Multisig type using the registry and the result from our RPC call
    const multisigType = api?.createType('PalletMultisigMultisig', multisigStorage)
    console.log('Multisig type: ', multisigType)

    /* const multisigCallIndex = (multisigType as any).when.index.toNumber()
    console.log('Multisig call index: ', multisigCallIndex)

    const multisigCallHeight = (multisigType as any).when.height.toNumber()
    console.log('Multisig call height: ', multisigCallHeight) */
  }

  return {
    initiateOrExecuteMultisigTradeCall,
    multisigAddress,
    sendCoreToMultisig,
    sendFundsToMultisig,
    txStatusMessage,
    isLoading,
    lasticAddress: LASTIC_ADDRESS,
  }
}
