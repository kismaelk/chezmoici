export const VILLES_CI = [
  {
    ville: 'Abidjan',
    communes: [
      'Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 'Marcory',
      'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Bingerville',
      'Riviera', 'Angré',
    ],
  },
  { ville: 'Bouaké', communes: ['Belleville', 'Koko', 'Ahougnansou', 'Air France'] },
  { ville: 'Daloa', communes: ['Lobia', 'Tazibouo', 'Kennedy'] },
  { ville: 'Yamoussoukro', communes: ['220 Logements', 'Habitat', 'Nanan'] },
  { ville: 'San-Pédro', communes: ['Bardo', 'Bardot', 'Séwéké'] },
  { ville: 'Korhogo', communes: ['Soba', 'Koko', 'Commerce'] },
  { ville: 'Man', communes: ['Libreville', 'Campus', 'Domoraud'] },
  { ville: 'Gagnoa', communes: ['Babré', 'Dioulabougou', 'Commerce'] },
  { ville: 'Abengourou', communes: ['Commerce', 'Cité des cadres', 'Quartier résidentiel'] },
  { ville: 'Anyama', communes: ['Belleville', 'RAN', 'Quartier résidentiel'] },
  { ville: 'Bingerville', communes: ['Akouai-Santai', 'Gbagba', 'Cité Marina'] },
  { ville: 'Soubré', communes: ['Nawa', 'Quartier Commerce', 'Cité CIE'] },
  { ville: 'Divo', communes: ['Konankro', 'Commerce', 'Légion'] },
  { ville: 'Odienné', communes: ['Kamatela', 'Commerce', 'Résidentiel'] },
  { ville: 'Bondoukou', communes: ['Zanzan', 'Donzou', 'Commerce'] },
]

export const VILLES_OPTIONS = VILLES_CI.map((v) => v.ville)

export function getCommunesParVille(ville) {
  const item = VILLES_CI.find((v) => v.ville === ville)
  return item?.communes || []
}

