import PrimaryButtonWithAutoTeleport from '@/components/button/PrimaryButtonWithAutoTeleport'
import { BN } from '@polkadot/util'
import { TxButtonProps, useBalance, useInkathon, useTxButton } from '@poppyseed/lastic-sdk'

export default function PurchaseInteractor({ param }: { param: string }) {
  const { api, activeSigner, activeAccount } = useInkathon()
  const { balanceFormatted, balance } = useBalance(activeAccount?.address, true)

  // Now that we've handled the undefined case, we can confidently use api
  const txButtonProps: TxButtonProps = {
    api, // api is guaranteed to be defined here
    setStatus: (status: string | null) => console.log('tx status:', status),
    attrs: {
      palletRpc: 'broker',
      callable: 'purchase',
      inputParams: [param],
      paramFields: [{ name: 'param', type: 'String', optional: false }],
    },
    type: 'SIGNED-TX',
    activeAccount,
    activeSigner,
  }

  const { transaction, status, allParamsFilled } = useTxButton(txButtonProps)

  return (
    <>
      <PrimaryButtonWithAutoTeleport
        title="buy core"
        onClick={transaction}
        disabled={!allParamsFilled()}
        amountNeeded={new BN(97 * 10 ** 12)}
        teleportTo="coretime"
      />
      <div className="mt-5" style={{ overflowWrap: 'break-word' }}>
        {status}
      </div>
    </>
  )
}
