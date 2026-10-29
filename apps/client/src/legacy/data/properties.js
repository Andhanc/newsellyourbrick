export const properties = [
  {
    id: 1,
    title: "2-bed apartment, 58 m², floor 9/10",
    location: "Novgorod Region, Veliky Novgorod, Bolshaya Moskovskaya St. 128/10",
    price: 35000,
    currentBid: 32000,
    images: [
      "/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg",
      "/images/external/photo-1484154218962-a197022b5858-c1598513e5.jpg",
      "/images/external/photo-1560448204-e02f11c3d0e2-d14b9ca751.jpg"
    ],
    area: 58,
    rooms: 2,
    floor: "9/10",
    description: "Bright 2-bedroom apartment for rent near shops and amenities. Cosmetic renovation, furnished with essentials: sofa, wardrobe, AC, washing machine, fridge, and kitchen set.",
    endTime: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 100 days (green — 3+ months)
    seller: "Realtor",
    sellerId: "ID 124809292",
    isAuction: true
  },
  {
    id: 2,
    title: "1-bed apartment, 37 m², floor 6/9",
    location: "Novgorod Region, Veliky Novgorod, Bolshaya Moskovskaya St. 124k2",
    price: 25000,
    currentBid: 23000,
    images: [
      "/images/external/photo-1502672260266-1c1ef2d93688-a4a56b6673.jpg",
      "/images/external/photo-1522771739844-6a9f6d5f14af-6b0b3bd36d.jpg",
      "/images/external/photo-1484101403633-562f891dc89a-12d9cf9785.jpg"
    ],
    area: 37,
    rooms: 1,
    floor: "6/9",
    description: "Cozy one-bedroom apartment (37 m²) in a 2015 panel building on floor 6 of 9. Spacious room (~18 m²), kitchen (~9 m²), 2.7 m ceilings, quiet courtyard view. Cosmetic renovation with furniture.",
    endTime: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // 75 days (orange — 2–3 months)
    seller: "Owner",
    sellerId: "ID 106668168",
    isAuction: true
  },
  {
    id: 3,
    title: "Cozy 1-bed apartment, 37 m², floor 1/9",
    location: "Novgorod Region, Veliky Novgorod, Volotovskaya St. 6",
    price: 36000,
    currentBid: 34000,
    images: [
      "/images/external/photo-1556912172-45b7abe8b7e1-b9e7d0f8dc.jpg",
      "/images/external/photo-1556912172-45b7abe8b7e1-b9e7d0f8dc.jpg",
      "/images/external/photo-1556912172-45b7abe8b7e1-b9e7d0f8dc.jpg"
    ],
    area: 37,
    rooms: 1,
    floor: "1/9",
    description: "Cozy one-bedroom apartment on the ground floor — convenient for families and seniors. Modern renovation, furniture and appliances included. Near transit, shops, and a kindergarten.",
    endTime: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 50 days (red — 1–2 months)
    seller: "Owner",
    sellerId: "ID 75852506",
    isAuction: true
  },
  {
    id: 4,
    title: "3-bed apartment, 85 m², floor 5/12",
    location: "Moscow, Lenina St. 15",
    price: 9500000,
    currentBid: 9200000,
    images: [
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg"
    ],
    area: 85,
    rooms: 3,
    floor: "5/12",
    description: "Spacious three-bedroom apartment in central Moscow. Quality finish, panoramic windows overlooking a park. Large living room, two bedrooms, modern kitchen. Furniture and appliances in excellent condition. Courtyard parking.",
    endTime: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 70 days (orange — 2–3 months)
    seller: "Realtor",
    sellerId: "ID 234567890",
    isAuction: true
  },
  {
    id: 5,
    title: "2-bed apartment, 65 m², floor 7/9",
    location: "Saint Petersburg, Nevsky Prospect 45",
    price: 7200000,
    currentBid: 7000000,
    images: [
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600585154526-990dced4db0d-06b654a393.jpg",
      "/images/external/photo-1600566753086-00f18fb6b3ea-16c5798373.jpg"
    ],
    area: 65,
    rooms: 2,
    floor: "7/9",
    description: "Two-bedroom apartment in the historic center of Saint Petersburg. High ceilings, large windows with Neva views. Fully renovated and move-in ready. Metro, shops, and cafés nearby.",
    endTime: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // 40 days (red — 1–2 months)
    seller: "Owner",
    sellerId: "ID 345678901",
    isAuction: true
  },
  {
    id: 6,
    title: "Studio, 28 m², floor 3/5",
    location: "Kazan, Baumana St. 12",
    price: 2800000,
    currentBid: 2600000,
    images: [
      "/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg",
      "/images/external/photo-1502672260266-1c1ef2d93688-a4a56b6673.jpg"
    ],
    area: 28,
    rooms: 0,
    floor: "3/5",
    description: "Cozy studio in central Kazan — ideal for one person or a couple. Modern renovation and essential furniture. University, cafés, and shops nearby.",
    endTime: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 25 days (red blinking — under 1 month)
    seller: "Realtor",
    sellerId: "ID 456789012",
    isAuction: true
  },
  {
    id: 7,
    title: "4-bed apartment, 120 m², floor 8/16",
    location: "Moscow, Tverskaya St. 25",
    price: 18500000,
    currentBid: 17500000,
    images: [
      "/images/external/photo-1600607687920-4e2a09cf159d-841fb3874c.jpg",
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600566753086-00f18fb6b3ea-16c5798373.jpg"
    ],
    area: 120,
    rooms: 4,
    floor: "8/16",
    description: "Spacious four-bedroom apartment in a prestigious Moscow district. Panoramic city-center views. Designer finish and furniture. Two bathrooms and a large kitchen-living area.",
    endTime: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 35 days (red — 1–2 months)
    seller: "Realtor",
    sellerId: "ID 567890123",
    isAuction: true
  },
  {
    id: 8,
    title: "1-bed apartment, 42 m², floor 4/10",
    location: "Saint Petersburg, Nevsky Prospect 88",
    price: 8500000,
    currentBid: 8200000,
    images: [
      "/images/external/photo-1502672260266-1c1ef2d93688-a4a56b6673.jpg",
      "/images/external/photo-1522771739844-6a9f6d5f14af-6b0b3bd36d.jpg",
      "/images/external/photo-1484101403633-562f891dc89a-12d9cf9785.jpg"
    ],
    area: 42,
    rooms: 1,
    floor: "4/10",
    description: "One-bedroom apartment in the historic center of Saint Petersburg. High ceilings, large windows. Fully renovated and ready to move in. Metro, shops, and cafés nearby.",
    endTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 20 days (red blinking — under 1 month)
    seller: "Owner",
    sellerId: "ID 678901234",
    isAuction: true
  },
  {
    id: 9,
    title: "Townhouse, 180 m², 2 floors",
    location: "Moscow Region, Odintsovo, Sadovaya St. 15",
    price: 24500000,
    currentBid: 23500000,
    images: [
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600585154526-990dced4db0d-06b654a393.jpg",
      "/images/external/photo-1600566753086-00f18fb6b3ea-16c5798373.jpg"
    ],
    area: 180,
    rooms: 5,
    floor: "2/2",
    description: "Modern townhouse in a gated community. Two floors, garage, ~600 m² plot. Fireplace, terrace, modern appliances. Secured area with a playground.",
    endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 15 days (red blinking — under 1 month)
    seller: "Realtor",
    sellerId: "ID 789012345",
    isAuction: true
  },
  {
    id: 10,
    title: "2-bed apartment, 55 m², floor 12/25",
    location: "Moscow, Leningradsky Prospect 45",
    price: 12500000,
    currentBid: 11800000,
    images: [
      "/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg",
      "/images/external/photo-1484154218962-a197022b5858-c1598513e5.jpg",
      "/images/external/photo-1560448204-e02f11c3d0e2-d14b9ca751.jpg"
    ],
    area: 55,
    rooms: 2,
    floor: "12/25",
    description: "Two-bedroom apartment in a new development. Panoramic windows overlooking a park. Modern layout and quality finish. Metro, mall, and park nearby.",
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000), // 10 days (red blinking — under 1 month)
    seller: "Owner",
    sellerId: "ID 890123456",
    isAuction: true
  },
  {
    id: 11,
    title: "Villa, 250 m², 3 floors",
    location: "Krasnodar Region, Sochi, Primorskaya St. 120",
    price: 45000000,
    currentBid: 42000000,
    images: [
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600607687920-4e2a09cf159d-841fb3874c.jpg",
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg"
    ],
    area: 250,
    rooms: 6,
    floor: "3/3",
    description: "Luxury seaside villa. Three floors, pool, sauna, sea-view terrace. ~1,500 m² plot, parking for 4 cars. Premium finishes and designer furniture.",
    endTime: new Date(Date.now() + 95 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 95 days (green — 3+ months)
    seller: "Realtor",
    sellerId: "ID 901234567",
    isAuction: true
  },
  {
    id: 12,
    title: "3-bed apartment, 95 m², floor 5/9",
    location: "Yekaterinburg, Lenina St. 50",
    price: 6800000,
    currentBid: 6500000,
    images: [
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg"
    ],
    area: 95,
    rooms: 3,
    floor: "5/9",
    description: "Three-bedroom apartment in central Yekaterinburg. Spacious living room, two bedrooms, modern kitchen. Quality renovation with furniture and appliances. Near downtown, park, and schools.",
    endTime: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // 65 days (orange — 2–3 months)
    seller: "Owner",
    sellerId: "ID 012345678",
    isAuction: true
  },
  {
    id: 13,
    title: "Townhouse, 160 m², 2 floors",
    location: "Moscow Region, Khimki, Lesnaya St. 5",
    price: 19500000,
    currentBid: 18500000,
    images: [
      "/images/external/photo-1570129477492-45c003edd2be-b1cf669c50.jpg",
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg"
    ],
    area: 160,
    rooms: 4,
    floor: "2/2",
    description: "Cozy townhouse in a quiet wooded area. Two floors, open kitchen-living room, terrace. ~600 m² plot and parking. Forest and river nearby.",
    endTime: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // 80 days (orange — 2–3 months)
    seller: "Realtor",
    sellerId: "ID 112233445",
    isAuction: true
  },
  {
    id: 14,
    title: "Premium townhouse, 200 m², 3 floors",
    location: "Moscow Region, Mytishchi, Mira St. 12",
    price: 28000000,
    currentBid: 26500000,
    images: [
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg"
    ],
    area: 200,
    rooms: 5,
    floor: "3/3",
    description: "Luxury premium townhouse. Three floors, spacious rooms, fireplace, terrace. ~800 m² plot with pool and sauna. Gated community with amenities.",
    endTime: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000), // 55 days (red — 1–2 months)
    seller: "Realtor",
    sellerId: "ID 223344556",
    isAuction: true
  },
  {
    id: 15,
    title: "Townhouse with garden, 170 m², 2 floors",
    location: "Leningrad Region, Vsevolozhsk, Tsentralnaya St. 20",
    price: 18500000,
    currentBid: 17500000,
    images: [
      "/images/external/photo-1600585154526-990dced4db0d-06b654a393.jpg",
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600566753086-00f18fb6b3ea-16c5798373.jpg"
    ],
    area: 170,
    rooms: 4,
    floor: "2/2",
    description: "Cozy townhouse with a private garden. Two floors, spacious rooms, kitchen-living area. ~500 m² plot and parking. Quiet family-friendly setting near forest.",
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // 30 days (red — 1–2 months)
    seller: "Owner",
    sellerId: "ID 334455667",
    isAuction: true
  },
  {
    id: 16,
    title: "Waterfront villa, 280 m², 3 floors",
    location: "Krasnodar Region, Anapa, Naberezhnaya St. 45",
    price: 52000000,
    currentBid: 49000000,
    images: [
      "/images/external/photo-1600607687920-4e2a09cf159d-841fb3874c.jpg",
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg"
    ],
    area: 280,
    rooms: 6,
    floor: "3/3",
    description: "Exclusive waterfront villa. Three floors, panoramic sea views, pool, sauna. ~1,200 m² plot with private beach access. Premium finishes and designer furniture.",
    endTime: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 28 days (red blinking — under 1 month)
    seller: "Realtor",
    sellerId: "ID 445566778",
    isAuction: true
  },
  {
    id: 17,
    title: "Mountain villa, 220 m², 2 floors",
    location: "Krasnodar Region, Sochi, Gornaya St. 88",
    price: 38000000,
    currentBid: 36000000,
    images: [
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg",
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600585154526-990dced4db0d-06b654a393.jpg"
    ],
    area: 220,
    rooms: 5,
    floor: "2/2",
    description: "Modern mountain villa with sea views. Two floors, large terraces, fireplace. ~1,000 m² plot with a pool. Quiet, nature-close setting — ideal for leisure.",
    endTime: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 45 days (red — 1–2 months)
    seller: "Owner",
    sellerId: "ID 556677889",
    isAuction: true
  },
  {
    id: 18,
    title: "Elite villa, 300 m², 3 floors",
    location: "Krasnodar Region, Gelendzhik, Primorskaya St. 200",
    price: 48000000,
    currentBid: 45000000,
    images: [
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600566753086-00f18fb6b3ea-16c5798373.jpg"
    ],
    area: 300,
    rooms: 7,
    floor: "3/3",
    description: "Luxury elite villa with sea views. Three floors, spacious rooms, home cinema, wine cellar. ~1,800 m² plot with pool and tennis court. Premium location.",
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 5 days (red blinking — under 1 month)
    seller: "Realtor",
    sellerId: "ID 667788990",
    isAuction: true
  },
  {
    id: 19,
    title: "Premium apartments, 95 m², floor 15/20",
    location: "Moscow, Tverskaya St. 10",
    price: 18500000,
    currentBid: 17500000,
    images: [
      "/images/external/photo-1560448204-e02f11c3d0e2-d14b9ca751.jpg",
      "/images/external/photo-1484154218962-a197022b5858-c1598513e5.jpg",
      "/images/external/photo-1564013799919-ab600027ffc6-0b929d901d.jpg"
    ],
    area: 95,
    rooms: 2,
    floor: "15/20",
    description: "Elite apartments in central Moscow. Panoramic city views, modern finishes. Fully furnished with premium appliances. Gated complex with underground parking.",
    endTime: new Date(Date.now() + 92 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // 92 days (green — 3+ months)
    seller: "Realtor",
    sellerId: "ID 778899001",
    isAuction: true
  },
  {
    id: 20,
    title: "Sea-view apartments, 75 m², floor 8/12",
    location: "Krasnodar Region, Sochi, Morskaya St. 25",
    price: 12500000,
    currentBid: 11800000,
    images: [
      "/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg",
      "/images/external/photo-1484154218962-a197022b5858-c1598513e5.jpg",
      "/images/external/photo-1560448204-e02f11c3d0e2-d14b9ca751.jpg"
    ],
    area: 75,
    rooms: 2,
    floor: "8/12",
    description: "Modern apartments with sea views. Panoramic balcony, quality finishes. Beach, restaurants, and entertainment nearby — great for leisure or investment.",
    endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // 12 days (red blinking — under 1 month)
    seller: "Owner",
    sellerId: "ID 889900112",
    isAuction: true
  },
  {
    id: 21,
    title: "Business-class apartments, 110 m², floor 10/15",
    location: "Saint Petersburg, Nevsky Prospect 100",
    price: 22000000,
    currentBid: 21000000,
    images: [
      "/images/external/photo-1600585154340-be6161a56a0c-fdb01a4056.jpg",
      "/images/external/photo-1600607687939-ce8a6c25118c-b4493b474b.jpg",
      "/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg"
    ],
    area: 110,
    rooms: 3,
    floor: "10/15",
    description: "Spacious business-class apartments in the historic center. High ceilings, large windows with Neva views. Modern layout and quality finishes. Metro and business district nearby.",
    endTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000), // 60 days (orange — 2–3 months)
    seller: "Realtor",
    sellerId: "ID 990011223",
    isAuction: true
  },
  {
    id: 22,
    title: "Studio apartments, 45 m², floor 5/10",
    location: "Moscow, Arbat St. 15",
    price: 8500000,
    currentBid: 8000000,
    images: [
      "/images/external/photo-1502672260266-1c1ef2d93688-a4a56b6673.jpg",
      "/images/external/photo-1522771739844-6a9f6d5f14af-6b0b3bd36d.jpg",
      "/images/external/photo-1484101403633-562f891dc89a-12d9cf9785.jpg"
    ],
    area: 45,
    rooms: 0,
    floor: "5/10",
    description: "Stylish studio apartments in the heart of Moscow. Contemporary design and functional layout. Ideal for one person or a couple. Everything you need is nearby.",
    endTime: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 38 days (red — 1–2 months)
    seller: "Owner",
    sellerId: "ID 001122334",
    isAuction: true
  }
]

