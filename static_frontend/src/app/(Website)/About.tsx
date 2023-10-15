// pages/index.tsx

import React from 'react';
import AboutCard from '@/components/card/AboutCard';

export default function Home() {
  const features = [
    {
      title: "MARKET-BASED SCALING",
      description: "Enhance the scalability of your parachains with on-demand multiple cores.",
      icon: <span className="text-3xl">📈</span>
    },
    {
      title: "FLEXIBLE PAYMENT OPTIONS",
      description: "From subscriptions to freemium models, choose how you want to pay for your blockspace.",
      icon: <span className="text-3xl">💰</span>
    },
    {
      title: "INSPIRED BY ENERGY MARKETS",
      description: "Drawing parallels from the energy sector, Lastic facilitates real-time spot markets, forward contracts, and capacity markets for blockspace.",
      icon: <span className="text-3xl">⚡</span>
    },
    {
      title: "COMMUNITY DRIVEN",
      description: "Actively engaging with the Polkadot and wider blockchain community for feedback, insights, and collaboration to continuously enhance the platform.",
      icon: <span className="text-3xl">🌍</span>
    },
    {
      title: "USER-CENTRIC UI/UX",
      description: "A meticulously designed interface that simplifies blockspace trading, ensuring a hassle-free experience even for newcomers.",
      icon: <span className="text-3xl">🖥️</span>
    },
    {
      title: "FLEXIBILITY BEYOND POLKADOT",
      description: "Purchase coretime in custom chunks and allocate variable time slices as per your workload.",
      icon: <span className="text-3xl">🔗</span>
    }
  ]

  return (
    <div className="bg-pink-100 min-h-screen p-10">
      <h1 className="text-3xl mb-10">ABOUT</h1>
      <h2 className="text-2xl mb-6">KEY FEATURES THAT SET US APART</h2>
      <div className="grid grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <AboutCard 
            key={index}
            title={feature.title} 
            description={feature.description} 
            icon={feature.icon} 
          />
        ))}
      </div>
    </div>
  )
}
