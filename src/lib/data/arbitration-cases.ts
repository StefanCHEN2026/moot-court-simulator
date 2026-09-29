/**
 * International Arbitration Preset Cases
 * Investment and Commercial Arbitration Problems
 */

export interface ArbitrationCase {
  id: string;
  name: string;
  year: number;
  description: string;
  imageUrl?: string; // Cover image for the case
  parties: {
    claimant: {
      name: string;
      description: string;
      counsel: string;
    };
    respondent: {
      name: string;
      description: string;
      counsel: string;
    };
  };
  arbitrators: {
    presiding: string;
    coArbitrator1?: string;
    coArbitrator2?: string;
  };
  tribunal: string;
  governingLaw: string[];
  arbitrationRules: string;
  seatOfArbitration: string;
  language: 'English';
  sourceUrl?: string;
  sourceLabel?: string;
  // Case materials
  proceduralHistory: string[];
  factsOfTheCase: string;
  claimantArguments: string[];
  respondentArguments: string[];
  disputedIssues: string[];
  requestedRelief: {
    claimant: string[];
    respondent: string[];
  };
  // Evidence documents
  exhibits: {
    id: string;
    description: string;
    submittedBy: 'claimant' | 'respondent';
    summary: string;
  }[];
  // Witness testimony
  witnesses: {
    name: string;
    role: string;
    party: 'claimant' | 'respondent';
    testimonySummary: string;
  }[];
}

/**
 * Bell v. France
 * Investment arbitration concerning regulatory measures affecting renewable energy investments
 */
export const frankfurt2024BellFrance: ArbitrationCase = {
  id: 'frankfurt-2024-bell-france',
  name: 'Bell v. France',
  year: 2024,
  description: 'Investment arbitration concerning France\'s regulatory measures affecting foreign investments in renewable energy sector, involving claims under the Energy Charter Treaty and France-Switzerland BIT.',
  imageUrl: '/arbitration-cover.jpeg',
  
  parties: {
    claimant: {
      name: 'Bell Energy SA',
      description: 'A Swiss-registered renewable energy company, subsidiary of Bell International Holdings Ltd., specializing in solar and wind energy projects across Europe.',
      counsel: 'White & Case LLP, Paris / Geneva'
    },
    respondent: {
      name: 'French Republic',
      description: 'Represented by the Agent of the French Government before international jurisdictions.',
      counsel: 'Direction des Affaires Juridiques, Ministère de l\'Europe et des Affaires Étrangères'
    }
  },
  
  arbitrators: {
    presiding: 'Prof. Dr. Gabrielle Kaufmann-Kohler (Switzerland)',
    coArbitrator1: 'Prof. Brigitte Stern (France) - Respondent appointee',
    coArbitrator2: 'Dr. Gary Born (Singapore) - Claimant appointee'
  },
  
  tribunal: 'Arbitral Tribunal constituted under the UNCITRAL Arbitration Rules',
  governingLaw: ['Energy Charter Treaty (ECT)', 'France-Switzerland BIT (1991)', 'French law (municipal law)', 'International law'],
  arbitrationRules: 'UNCITRAL Arbitration Rules 2010',
  seatOfArbitration: 'Paris, France',
  language: 'English',
  
  proceduralHistory: [
    '12 September 2022 - Notice of Intent to Submit a Claim to Arbitration served on the French Republic',
    '15 December 2022 - Request for Arbitration filed by Bell Energy SA with the PCA',
    '28 February 2023 - Answer to Request for Arbitration filed by the French Republic',
    '15 April 2023 - Tribunal constituted: Prof. Dr. Gabrielle Kaufmann-Kohler (Presiding Arbitrator), Prof. Brigitte Stern, Dr. Gary Born',
    '20 May 2023 - First Procedural Order issued (Schedule of Proceedings)',
    '15 July 2023 - Claimant\'s Memorial filed',
    '15 September 2023 - Respondent\'s Counter-Memorial filed',
    '1 November 2023 - Claimant\'s Reply filed',
    '1 December 2023 - Respondent\'s Rejoinder filed',
    '20-22 February 2024 - Hearing on the Merits held at the International Chamber of Commerce in Paris',
    '15 March 2024 - Post-Hearing Briefs and Replies submitted',
    '30 April 2024 - Tribunal deliberations concluded'
  ],
  
  factsOfTheCase: `
**1. THE INVESTMENT**

Bell Energy SA ("Bell"), a Swiss company incorporated in Geneva, invested €450 million in solar energy projects in southern France between 2015 and 2019. The investment comprised:

(a) **Solar Park Provence**: A 120 MW photovoltaic installation in the Provence-Alpes-Côte d\'Azur region, operational since 2017, representing an investment of €280 million.

(b) **Solar Project Occitanie**: A development-stage project for a 200 MW solar park in Occitanie, with €170 million already invested in land acquisition, permits, and preliminary construction.

**2. THE REGULATORY FRAMEWORK AT INVESTMENT**

At the time of Bell\'s investment, France maintained a favorable regulatory regime for renewable energy under:

- Law No. 2000-108 of 10 February 2000 on the modernization and development of public electricity service (the "Electricity Law")
- Feed-in tariffs guaranteeing €0.35/kWh for solar energy for 20 years
- Tax incentives including reduced corporate tax rates and accelerated depreciation

**3. THE CHALLENGED MEASURES**

On 1 July 2021, France enacted Law No. 2021-876 ("the 2021 Energy Reform Law"), which:

(a) **Reduced Feed-in Tariffs**: Reduced the guaranteed price for solar energy from €0.35/kWh to €0.18/kWh for existing installations, representing a 48.6% reduction.

(b) **Introduced Capacity Auctions**: Replaced administrative feed-in tariffs with competitive bidding, requiring existing operators to participate in annual auctions to maintain their operational permits.

(c) **Imposed Grid Access Restrictions**: Granted priority grid access to state-owned EDF\'s renewable subsidiaries over independent producers.

(d) **Tax Incentive Elimination**: Eliminated the reduced corporate tax rate and accelerated depreciation benefits for renewable energy investors.

**4. THE TEMPORARY MORATORIUM**

On 15 September 2021, the French Ministry of Ecological Transition issued Decree No. 2021-1184, imposing a 24-month moratorium on:

- New grid connections for independent solar producers
- Processing of pending permit applications
- Transfer of existing permits to new operators

**5. IMPACT ON BELL\'S INVESTMENT**

As a result of these measures:

(a) Solar Park Provence experienced a 65% reduction in revenue (from €42 million annually to €14.7 million).

(b) Solar Project Occitanie was rendered uneconomic; the €170 million investment cannot be recovered under the new tariff regime.

(c) Bell was forced to terminate 85% of its workforce (230 employees).

(d) Bell\'s request to transfer its permits to a third party was rejected under the moratorium.

**6. PROCEDURAL HISTORY**

Bell initiated amiable approaches with France on 1 March 2022, seeking compensation for the measures\' impact. Negotiations failed. Bell served a Notice of Intent to Submit a Claim to Arbitration on 12 September 2022, and filed its Request for Arbitration on 15 December 2022.
  `.trim(),
  
  claimantArguments: [
    '**Breach of Fair and Equitable Treatment (FET)**: France violated the FET standard under ECT Art. 10(1) and France-Switzerland BIT Art. 3 by fundamentally altering the regulatory framework that induced Bell\'s investment, destroying its legitimate expectations.',
    '**Unreasonable/Discriminatory Measures**: The 2021 Energy Reform Law discriminates against foreign investors by favoring state-owned EDF, violating ECT Art. 10(1) and the non-discrimination provisions of the BIT.',
    '**Indirect Expropriation**: The combined effect of the tariff reduction, auction requirements, and grid access restrictions constitutes indirect expropriation under ECT Art. 13 and BIT Art. 5, depriving Bell of the fundamental economic value of its investment.',
    '**Umbrella Clause Violation**: France violated specific commitments made to Bell under investment contracts and the regulatory framework, breaching the umbrella clause in BIT Art. 9.',
    '**Full Protection and Security**: The moratorium violated France\'s obligation to provide full protection and security under BIT Art. 4 by preventing Bell from operating its investment.',
    '**Legitimate Expectations**: Bell had legitimate expectations based on France\'s specific representations in the Electricity Law, administrative decisions, and investment promotion materials.',
    '**Proportionality**: The measures are disproportionate to any legitimate public policy objective and were implemented without adequate transition periods or grandfathering provisions.'
  ],
  
  respondentArguments: [
    '**No Violation of FET**: States have the right to regulate in the public interest. The measures were non-discriminatory regulatory adjustments that did not destroy Bell\'s legitimate expectations, which must be assessed against the State\'s police powers.',
    '**Police Powers Doctrine**: The measures constitute a legitimate exercise of France\'s police powers to address climate change, reduce electricity prices, and align with EU energy policy, for which no compensation is due.',
    '**No Expropriation**: The measures did not substantially deprive Bell of its investment. Bell retains ownership, operational control, and continues to generate revenue. Regulatory adjustments do not constitute expropriation.',
    '**No Discrimination**: The measures apply equally to domestic and foreign investors. EDF\'s subsidiaries are subject to the same regulatory framework.',
    '**No Umbrella Clause Violation**: The alleged commitments were not specific to Bell and do not constitute "investment contracts" within the meaning of the BIT.',
    '**Legitimate Expectations Not Breached**: Bell\'s expectations were not legitimate because: (a) the regulatory framework contained change clauses; (b) investors must anticipate regulatory evolution; (c) France made no specific commitments.',
    '**Proportionality Satisfied**: The measures are proportionate to the legitimate objective of reducing electricity costs for consumers and meeting EU renewable energy targets.'
  ],
  
  disputedIssues: [
    'Whether France\'s 2021 Energy Reform Law violates the Fair and Equitable Treatment standard under ECT Art. 10(1) and France-Switzerland BIT Art. 3.',
    'Whether the challenged measures constitute indirect expropriation under ECT Art. 13 and BIT Art. 5.',
    'Whether the police powers doctrine shields France from liability for the regulatory measures.',
    'Whether Bell\'s legitimate expectations were destroyed by France\'s regulatory changes.',
    'Whether the measures were discriminatory or accorded national treatment.',
    'Whether France violated any specific commitments under the umbrella clause.',
    'Whether the moratorium violated the full protection and security standard.',
    'The appropriate measure and quantum of damages, if any.',
    'Whether moral damages are available for alleged harassment and bad faith.'
  ],
  
  requestedRelief: {
    claimant: [
      'A declaration that France breached its obligations under the ECT and France-Switzerland BIT.',
      'An order that France pay compensation for the destruction of Bell\'s investment in the amount of €450,000,000 plus interest.',
      'Alternatively, compensation for lost profits (Exhibit C-12) in the amount of €680,000,000.',
      'Moral damages in the amount of €5,000,000 for France\'s alleged harassment and bad faith.',
      'Reimbursement of all arbitration costs and legal fees.',
      'Such other relief as the Tribunal deems appropriate.'
    ],
    respondent: [
      'A declaration that Bell\'s claims are dismissed in their entirety.',
      'An order that Bell bears all arbitration costs and reimburses France\'s legal fees.',
      'A finding that France\'s measures were a legitimate exercise of regulatory authority.',
      'Such other relief as the Tribunal deems appropriate.'
    ]
  },
  
  exhibits: [
    {
      id: 'C-1',
      description: 'Certificate of Incorporation of Bell Energy SA (Swiss Commercial Register)',
      submittedBy: 'claimant',
      summary: 'Establishes Bell\'s Swiss nationality and corporate structure.'
    },
    {
      id: 'C-2',
      description: 'France-Switzerland BIT (1991), certified copy',
      submittedBy: 'claimant',
      summary: 'Applicable bilateral investment treaty with FET, expropriation, and umbrella clause provisions.'
    },
    {
      id: 'C-3',
      description: 'Energy Charter Treaty (1994), relevant provisions',
      submittedBy: 'claimant',
      summary: 'Multilateral treaty applicable to energy sector investments.'
    },
    {
      id: 'C-4',
      description: 'Investment Promotion Materials from French Government (2015-2017)',
      submittedBy: 'claimant',
      summary: 'Government materials promoting renewable energy investment with guaranteed tariffs.'
    },
    {
      id: 'C-5',
      description: 'Construction and Operation Permits for Solar Park Provence',
      submittedBy: 'claimant',
      summary: 'Administrative authorizations establishing the investment.'
    },
    {
      id: 'C-6',
      description: 'Feed-in Tariff Contract between Bell and EDF (2017)',
      submittedBy: 'claimant',
      summary: '20-year power purchase agreement at €0.35/kWh.'
    },
    {
      id: 'C-7',
      description: 'Law No. 2021-876 of 1 July 2021 (2021 Energy Reform Law)',
      submittedBy: 'claimant',
      summary: 'The primary challenged legislation reducing tariffs and introducing auctions.'
    },
    {
      id: 'C-8',
      description: 'Decree No. 2021-1184 of 15 September 2021 (Moratorium)',
      submittedBy: 'claimant',
      summary: 'The moratorium on new connections and permit transfers.'
    },
    {
      id: 'C-9',
      description: 'Financial Statements of Bell Energy SA (2017-2023)',
      submittedBy: 'claimant',
      summary: 'Demonstrating the financial impact of the measures.'
    },
    {
      id: 'C-10',
      description: 'Expert Report on Investment Valuation (Prof. Dr. Pierre Lasserre)',
      submittedBy: 'claimant',
      summary: 'Damages quantification using DCF methodology.'
    },
    {
      id: 'C-11',
      description: 'Correspondence with French Authorities (2022)',
      submittedBy: 'claimant',
      summary: 'Amiable approaches and France\'s responses.'
    },
    {
      id: 'C-12',
      description: 'Notice of Intent to Submit a Claim to Arbitration',
      submittedBy: 'claimant',
      summary: 'Compliance with 3-month waiting period under BIT Art. 10.'
    },
    {
      id: 'R-1',
      description: 'Parliamentary Debates on the 2021 Energy Reform Law',
      submittedBy: 'respondent',
      summary: 'Legislative history demonstrating public interest objectives.'
    },
    {
      id: 'R-2',
      description: 'EU Directive 2018/2001 on Renewable Energy',
      submittedBy: 'respondent',
      summary: 'EU law requiring competitive bidding for renewable support.'
    },
    {
      id: 'R-3',
      description: 'Report of the Energy Regulatory Commission (CRE) on Tariff Reform',
      submittedBy: 'respondent',
      summary: 'Justification for tariff reduction based on cost decreases.'
    },
    {
      id: 'R-4',
      description: 'EDF\'s Annual Reports showing application of same measures',
      submittedBy: 'respondent',
      summary: 'Evidence that measures apply equally to state-owned operators.'
    },
    {
      id: 'R-5',
      description: 'Comparative Study: Solar Energy Costs 2010-2021',
      submittedBy: 'respondent',
      summary: 'Showing 70% decrease in solar panel costs justifying tariff adjustment.'
    },
    {
      id: 'R-6',
      description: 'French Constitutional Council Decision No. 2021-912',
      submittedBy: 'respondent',
      summary: 'Constitutional validation of the Energy Reform Law.'
    }
  ],
  
  witnesses: [
    {
      name: 'Mr. Alexander Bell',
      role: 'CEO, Bell Energy SA',
      party: 'claimant',
      testimonySummary: 'Testified on the investment decision, reliance on French regulatory framework, and impact of the challenged measures on Bell\'s operations and financial position.'
    },
    {
      name: 'Dr. Isabelle Durand',
      role: 'Former Director, French Investment Promotion Agency',
      party: 'claimant',
      testimonySummary: 'Testified on specific representations made to investors regarding the stability of the renewable energy regulatory framework.'
    },
    {
      name: 'Prof. Dr. Thomas Wälde',
      role: 'Expert Witness on International Energy Law',
      party: 'claimant',
      testimonySummary: 'Expert testimony on legitimate expectations under the ECT and customary international law.'
    },
    {
      name: 'Mr. Jean-Pierre Laurent',
      role: 'Director, Ministry of Ecological Transition',
      party: 'respondent',
      testimonySummary: 'Testified on the policy objectives and legislative process of the 2021 Energy Reform Law.'
    },
    {
      name: 'Dr. Marie Fontaine',
      role: 'Former Chair, Energy Regulatory Commission (CRE)',
      party: 'respondent',
      testimonySummary: 'Testified on the technical and economic justification for tariff adjustments and competitive bidding.'
    },
    {
      name: 'Prof. Dr. Andreas Lowenfeld',
      role: 'Expert Witness on Expropriation Law',
      party: 'respondent',
      testimonySummary: 'Expert testimony on the police powers doctrine and indirect expropriation standards.'
    }
  ]
};

/**
 * GreenTech Solutions v. Nordic Machinery
 * Commercial arbitration concerning sale of industrial equipment for green hydrogen production
 * 
 * Key legal issues:
 * - CISG applicability and interpretation
 * - Conformity of goods (Art. 35 CISG)
 * - Notice of non-conformity (Art. 39 CISG)
 * - Avoidance of contract (Art. 49 CISG)
 * - Damages calculation (Art. 74-76 CISG)
 */
export const visMoot28GreenTech: ArbitrationCase = {
  id: 'vis-moot-28-greentech-nordic',
  name: 'GreenTech Solutions v. Nordic Machinery',
  year: 2025,
  description: 'Commercial arbitration concerning the sale of specialized industrial equipment for green hydrogen production facilities. The dispute involves alleged non-conformity of delivered electrolyzers, questions of timely notice under CISG Art. 39, and claims for damages following contract avoidance.',
  imageUrl: '/arbitration-cover.jpeg',
  
  parties: {
    claimant: {
      name: 'GreenTech Solutions GmbH',
      description: 'A German engineering company specializing in green hydrogen production facilities, operating multiple hydrogen plants across Europe.',
      counsel: 'Freshfields Bruckhaus Deringer, Frankfurt'
    },
    respondent: {
      name: 'Nordic Machinery AS',
      description: 'A Norwegian manufacturer of industrial electrolyzers and hydrogen production equipment, a leading supplier in the Nordic region.',
      counsel: 'Schjødt AS, Oslo'
    }
  },
  
  arbitrators: {
    presiding: 'Prof. Dr. Christian B. B. Gray (Germany)',
    coArbitrator1: 'Ms. Anne K. Flateland (Norway) - Respondent appointee',
    coArbitrator2: 'Dr. Michael J. Bonell (Italy) - Claimant appointee'
  },
  
  tribunal: 'Arbitral Tribunal constituted under the ICC Arbitration Rules',
  governingLaw: [
    'CISG (United Nations Convention on Contracts for the International Sale of Goods)',
    'German Law (for issues not governed by CISG)',
    'UNIDROIT Principles of International Commercial Contracts (as supplementary rules)'
  ],
  arbitrationRules: 'ICC Rules of Arbitration (2021)',
  seatOfArbitration: 'Paris, France',
  language: 'English',
  
  proceduralHistory: [
    'March 15, 2024: Claimant delivered Request for Arbitration to ICC International Court of Arbitration',
    'April 10, 2024: ICC notified Respondent of arbitration and invited answer',
    'May 8, 2024: Respondent submitted Answer to Request for Arbitration with counterclaim',
    'May 25, 2024: Tribunal constituted',
    'June 15, 2024: Terms of Reference signed by parties and Tribunal',
    'July 20, 2024: Claimant submitted Memorial',
    'September 15, 2024: Respondent submitted Counter-Memorial',
    'October 20, 2024: Claimant submitted Reply',
    'November 15, 2024: Respondent submitted Rejoinder',
    'December 10-12, 2024: Evidentiary Hearing held in Paris'
  ],
  
  factsOfTheCase: `
**Background and Contract Formation**

On January 10, 2024, GreenTech Solutions GmbH ("GreenTech") and Nordic Machinery AS ("Nordic") entered into a contract for the sale and delivery of five (5) Model NE-5000 Proton Exchange Membrane (PEM) electrolyzers for use in GreenTech's planned hydrogen production facility in Hamburg, Germany.

**Contract Terms:**
- Total contract price: EUR 12,500,000 (EUR 2,500,000 per unit)
- Payment terms: 30% down payment, 70% upon delivery and acceptance
- Delivery date: June 30, 2024
- Performance specifications: Each electrolyzer to produce minimum 500 Nm³/h of hydrogen at ≥99.99% purity
- Warranty: 24 months from acceptance, covering defects in materials and workmanship
- Dispute resolution: ICC Arbitration in Paris

**Performance and Delivery**

Nordic delivered all five electrolyzers on June 28, 2024, two days ahead of schedule. GreenTech paid the outstanding 70% contract price (EUR 8,750,000) upon delivery.

During initial testing in July 2024, GreenTech's engineers discovered that the electrolyzers were not meeting the guaranteed hydrogen purity specification:
- Units 1-3: Achieved only 99.7% hydrogen purity (below the 99.99% specification)
- Units 4-5: Achieved 99.95% purity (marginally below specification)

The lower purity levels would require additional purification equipment, increasing GreenTech's capital costs by approximately EUR 850,000 and causing a 3-month delay in commercial operations.

**Notice and Subsequent Events**

On August 15, 2024 (48 days after delivery), GreenTech sent Nordic a formal notice of non-conformity, stating that the electrolyzers failed to meet the contractual purity specifications and requesting:
1. Replacement of all five units with conforming equipment within 60 days, OR
2. Price reduction of EUR 1,500,000 plus compensation for additional purification costs

Nordic disputed the claim, arguing:
- The purity deviation was minor and within industry-accepted tolerances
- GreenTech's notice was not given within a "reasonable time" under CISG Art. 39
- The additional purification costs were not foreseeable damages

**Attempts at Resolution**

On September 5, 2024, Nordic proposed to send technical specialists to optimize the equipment. After two weeks of on-site adjustments (September 10-25), Units 4-5 were brought to 99.99% purity, but Units 1-3 continued to underperform at only 99.85% purity.

On October 1, 2024, GreenTech declared the contract avoided under CISG Art. 49 regarding Units 1-3 and demanded restitution of EUR 7,500,000 (price for three units) plus damages.

Nordic refused to accept the avoidance, maintaining that:
- The partial non-conformity did not amount to a fundamental breach
- GreenTech had lost the right to avoid due to late notice
- The contract remained partially executable for all five units
  `,
  
  claimantArguments: [
    'The electrolyzers delivered by Nordic constituted non-conforming goods under CISG Art. 35, failing to meet the express quality specification of ≥99.99% hydrogen purity.',
    'GreenTech gave notice of non-conformity within a reasonable time (48 days) under CISG Art. 39, as complex industrial equipment requires extensive testing before defects can be identified.',
    'The non-conformity of Units 1-3 amounts to a fundamental breach under CISG Art. 25, substantially depriving GreenTech of what it was entitled to expect under the contract.',
    'Even if notice was technically late, Nordic should be estopped from relying on Art. 39(2) because GreenTech had no reasonable means of discovering the defect earlier.',
    'GreenTech validly avoided the contract under CISG Art. 49(1)(a) and is entitled to restitution plus damages under Arts. 74-76.',
    'Damages should include: (a) restitution of EUR 7,500,000, (b) additional purification costs of EUR 510,000 for Units 1-3, (c) lost profits from 3-month delay (EUR 2,400,000).'
  ],
  
  respondentArguments: [
    'The deviation in hydrogen purity (0.15-0.3%) was de minimis and within industry-accepted tolerances for PEM electrolyzers; the goods were fit for ordinary purposes under CISG Art. 35(2)(b).',
    'GreenTech\'s notice given 48 days after delivery was not within a "reasonable time" under CISG Art. 39(1); prompt examination of industrial equipment should have revealed any defects within 2-3 weeks.',
    'GreenTech lost the right to rely on the lack of conformity because notice was not given within a reasonable time, per CISG Art. 39(1).',
    'Even if there was non-conformity, it was not fundamental; the electrolyzers were functional and the purity issue was remediable through Nordic\'s subsequent optimization efforts.',
    'GreenTech could not validly avoid the contract; partial avoidance of 3 out of 5 units is not permitted under CISG Art. 49, which requires avoidance of the contract as a whole.',
    'The claimed damages for lost profits are not recoverable as they were not foreseeable under CISG Art. 74 at the time of contract formation.'
  ],
  
  disputedIssues: [
    'Did the delivered electrolyzers conform to the contract under CISG Art. 35?',
    'Was GreenTech\'s notice of non-conformity given within a reasonable time under CISG Art. 39(1)?',
    'Does the non-conformity, if established, amount to a fundamental breach under CISG Art. 25?',
    'May GreenTech avoid the contract for only 3 of the 5 units delivered, or must avoidance be for the entire contract?',
    'What damages, if any, is GreenTech entitled to recover, and what is the proper method of calculation under CISG Arts. 74-76?',
    'Should Nordic\'s counterclaim for unpaid maintenance fees (EUR 75,000) be allowed?'
  ],
  
  requestedRelief: {
    claimant: [
      'A declaration that GreenTech validly avoided the contract for Units 1-3 under CISG Art. 49;',
      'An order that Nordic pay GreenTech EUR 7,500,000 as restitution for the avoided portion of the contract;',
      'An award of damages in the amount of EUR 2,910,000, comprising: (a) EUR 510,000 for additional purification equipment costs, (b) EUR 2,400,000 for lost profits during operational delay;',
      'An order that Nordic reimburse GreenTech for arbitration costs and legal expenses;',
      'Dismissal of Respondent\'s counterclaim in its entirety.'
    ],
    respondent: [
      'Dismissal of Claimant\'s claims in their entirety;',
      'A declaration that the contract remains in force for all five electrolyzers;',
      'An order that GreenTech pay the invoiced maintenance fees of EUR 75,000;',
      'An award of costs in favor of Respondent.'
    ]
  },
  
  exhibits: [
    {
      id: 'C-1',
      description: 'Contract dated January 10, 2024 with all specifications',
      submittedBy: 'claimant',
      summary: 'Master contract including technical specifications and arbitration clause.'
    },
    {
      id: 'C-2',
      description: 'Delivery receipt and acceptance protocol dated June 28, 2024',
      submittedBy: 'claimant',
      summary: 'Acknowledging delivery of five NE-5000 electrolyzers.'
    },
    {
      id: 'C-3',
      description: 'Internal test reports dated July 5-28, 2024',
      submittedBy: 'claimant',
      summary: 'Documenting hydrogen purity levels below specifications for all units.'
    },
    {
      id: 'C-4',
      description: 'Notice of Non-Conformity dated August 15, 2024',
      submittedBy: 'claimant',
      summary: 'Formal notice to Nordic specifying the defects and requested remedies.'
    },
    {
      id: 'C-5',
      description: 'Declaration of Contract Avoidance dated October 1, 2024',
      submittedBy: 'claimant',
      summary: 'GreenTech\'s formal declaration avoiding the contract for Units 1-3.'
    },
    {
      id: 'C-6',
      description: 'Expert Report by Prof. Dr. Inge Hoffmann, TU Munich',
      submittedBy: 'claimant',
      summary: 'Expert opinion on PEM electrolyzer industry standards and purity requirements.'
    },
    {
      id: 'R-1',
      description: 'Product Specifications Sheet for NE-5000 Model',
      submittedBy: 'respondent',
      summary: 'Standard product specifications showing 99.9% minimum purity in standard configuration.'
    },
    {
      id: 'R-2',
      description: 'Email correspondence June-July 2024',
      submittedBy: 'respondent',
      summary: 'Showing GreenTech\'s engineers reported initial satisfaction with equipment.'
    },
    {
      id: 'R-3',
      description: 'Technical Team Visit Report dated September 25, 2024',
      submittedBy: 'respondent',
      summary: 'Documenting successful optimization of Units 4-5 and improvement of Units 1-3.'
    },
    {
      id: 'R-4',
      description: 'Industry Standard Study by Norwegian Hydrogen Association',
      submittedBy: 'respondent',
      summary: 'Showing 99.7% purity is acceptable for most industrial applications.'
    },
    {
      id: 'R-5',
      description: 'Invoice for Maintenance Services dated November 15, 2024',
      submittedBy: 'respondent',
      summary: 'EUR 75,000 for routine maintenance performed in October 2024.'
    }
  ],
  
  witnesses: [
    {
      name: 'Dr. Heinrich Müller',
      role: 'Chief Technology Officer, GreenTech Solutions GmbH',
      party: 'claimant',
      testimonySummary: 'Testified on the critical importance of 99.99% purity for GreenTech\'s hydrogen customers in the semiconductor industry, the testing process, and the impact of non-conformity on commercial operations.'
    },
    {
      name: 'Ms. Sophia Klein',
      role: 'Project Manager, Hamburg Hydrogen Facility',
      party: 'claimant',
      testimonySummary: 'Testified on the timeline of discovery, the August 15 notice, and negotiations with Nordic.'
    },
    {
      name: 'Mr. Erik Hansen',
      role: 'VP Engineering, Nordic Machinery AS',
      party: 'respondent',
      testimonySummary: 'Testified on the technical specifications, industry standards, and the optimization work performed in September 2024.'
    },
    {
      name: 'Dr. Anna Svensson',
      role: 'Quality Assurance Director, Nordic Machinery AS',
      party: 'respondent',
      testimonySummary: 'Testified on Nordic\'s quality control processes and the interpretation of product specifications.'
    }
  ]
};

/**
 * 西文簿记案 - 1921年菲律宾《西文簿记法》合宪性审查
 * Legal History: Chinese Merchants v. Philippine Bookkeeping Act
 * US Supreme Court: Yu Cong Eng v. Trinidad, 271 U.S. 500 (1926)
 */
export const bookkeepingAct1921: ArbitrationCase = {
  id: 'bookkeeping-act-1921',
  name: '南洋长歌：1921菲律宾华商西文簿记案',
  year: 1926,
  description: '1921年菲律宾议会通过《西文簿记法》(Bookkeeping Act of 1921)，禁止在菲商业使用中文记账，违者面临刑事处罚。华侨商人从马尼拉初审法院一路上诉至美国联邦最高法院。1926年6月7日，首席大法官塔夫特执笔，九位大法官一致裁定该法违反《菲律宾自治法》第3条（正当程序与平等保护原则），因违宪而无效。该案是近代华侨抗争"苛例"取得的罕见全面胜利。',
  imageUrl: '/bookkeeping-cover.jpg',
  sourceUrl: 'https://mp.weixin.qq.com/s/l0Lp1t7o732uYXZjaOpCdQ?scene=1&click_id=2',
  sourceLabel: '案例来源',
  
  parties: {
    claimant: {
      name: '余孔英等人（Yu Cong Eng et al.）——在菲华侨商人代表',
      description: '在菲律宾经营零售业的华侨商人团体。受1921年《西文簿记法》影响，面临无法使用中文记账的困境。当时在菲约5万华侨中，精通外文者不足十人，所有商铺账簿均以中文登记。华侨商会筹集十六万七千余元作为诉讼经费，由薛敏老（美国密歇根大学法学院毕业、菲律宾执业律师）统筹法律事务。',
      counsel: '高特兄弟律师事务所（Coudert Brothers, New York）'
    },
    respondent: {
      name: '菲律宾群岛政府（Government of the Philippine Islands）',
      description: '在美国殖民统治下的菲律宾地方政府。1921年由菲律宾议会通过《西文簿记法》，经总督哈里森批准施行。该法要求所有商业账簿须以英文、西班牙文或菲律宾本地语言登记，违反者处以罚金及两年以下监禁。',
      counsel: '菲律宾总检察长办公室（Office of the Solicitor General, Philippines）'
    }
  },
  
  arbitrators: {
    presiding: '威廉·霍华德·塔夫特大法官（Chief Justice William Howard Taft）——曾任菲律宾总督（1901-1904）及美国总统（1909-1913）',
    coArbitrator1: '九位大法官一致裁定（Unanimous 9-0 Decision）'
  },
  
  tribunal: '美国联邦最高法院（Supreme Court of the United States）',
  governingLaw: [
    '《菲律宾自治法》第3条（Philippine Autonomy Act of 1916, §3——正当程序与平等保护条款）',
    '美国宪法第十四修正案（U.S. Constitution, Fourteenth Amendment——正当程序与平等保护条款）',
    '1903年《中美通商行船续订条约》（US-China Treaty of Commerce and Navigation, 1903——最惠国待遇条款）',
    '《菲律宾组织法》（Philippine Organic Act of 1902）',
    '国际法（International Law——对外国人财产保护的一般原则）'
  ],
  arbitrationRules: '美国联邦最高法院调卷令程序（Certiorari Procedure, Judiciary Act of 1925）',
  seatOfArbitration: '华盛顿哥伦比亚特区，美国（Washington, D.C., United States）',
  language: 'English',
  
  proceduralHistory: [
    '1912年——菲律宾众议院首次提出《西文簿记法》草案，在马尼拉中华商会的游说下暂时搁置',
    '1917年——菲律宾税务局以行政命令要求华商改用西文簿记，中华总会抗议后取消',
    '1921年2月9日——菲律宾议会两院通过《西文簿记法》，等待总督批准',
    '1921年2月21日——总督哈里森批准该法，定于同年11月1日生效',
    '1921年4月——华商薛敏老、吴克诚前往中国及美国寻求外交支持',
    '1921年10月26日——新任总督伍德建议将法律推迟至1923年1月1日施行',
    '1923年3月2日——华侨杨孔莺因继续使用中文记账被诉至马尼拉初审法院（CFI Manila），被判有罪',
    '1923年——杨孔莺上诉至菲律宾高等法院（Philippine Supreme Court），法院裁定暂缓实施该法',
    '1925年2月6日——菲律宾高等法院以4:2裁定《西文簿记法》合宪，采用目的解释方法',
    '1925年10月——华商向美国联邦最高法院申请调卷令获受理',
    '1925年12月——华侨商会会长薛敏老赴美请愿，统筹上诉事宜',
    '1926年4月12日——美国联邦最高法院开庭审理',
    '1926年6月7日——美国联邦最高法院九位大法官一致裁定：《西文簿记法》因违宪而无效'
  ],
  
  factsOfTheCase: `
一、历史背景

菲律宾自1898年美西战争后成为美国殖民地。1902年美国国会通过《菲律宾组织法》，在菲律宾建立美式三权分立制度，司法终审权属于美国联邦最高法院。1916年美国国会通过《菲律宾自治法》，允诺菲律宾在条件成熟时独立，但保留司法终审权。

1920年代在菲华侨约5万人，以经商为主。华侨每年缴纳菲律宾政府约500万元税款，占全岛税收的65%，经营商店约15,000家，资本超过2亿元者有16家。华商掌控菲律宾零售渠道，在市场中占有重要地位。

二、争议立法

1921年2月9日，菲律宾议会通过《西文簿记法》(Bookkeeping Act of 1921)，经总督哈里森批准后定于同年11月1日生效。该法规定：

(1) 在菲律宾经营商业或从事会计业务者，必须使用英文、西班牙文或菲律宾本地语言进行簿记；
(2) 违反者将被处以罚金及两年以下监禁；
(3) 该法实质上禁止了在菲华商使用中文记账。

三、华商困境

当时在菲华侨中，精通外国语言者不足十人。所有商铺账簿均以中文（闽南语汉字）登记。若该法施行，在菲华商的全部商业活动将陷入瘫痪。

四、上诉过程

在外交交涉取得法案暂缓施行后，华商采用"以身试法"策略。华侨杨孔莺自荐作为被告，因继续使用中文记账被诉至马尼拉初审法院并被判有罪。案件上诉至菲律宾高等法院，该院以4:2裁定该法合宪。华商在薛敏老、吴克诚统筹下筹集巨款，聘请美国高特兄弟律师事务所，向美国联邦最高法院提起上诉。

五、美国联邦最高法院判决

1926年4月12日开庭审理，6月7日宣判。首席大法官塔夫特（曾任菲律宾总督及美国总统）执笔判决书，九位大法官一致裁定：《西文簿记法》因违反《菲律宾自治法》第3条——"不得实施未经正当程序即剥夺任何人的生命、自由或者财产的法律，或者否定任何人享有法律的平等保护"——而无效。

法院认为：(1) 法律应当尊重文本原有含义，不能进行偏离文义的目的解释（驳回菲律宾高院的解释）；(2) 《西文簿记法》是对私人商业的武断干预和不当限制；(3) 该法构成对华侨商人的歧视性待遇，违反正当程序和平等保护原则。`,
  
  claimantArguments: [
    '**违反中美通商条约**：《西文簿记法》禁止华商使用中文记账，实质上构成对华商的不公平歧视，违反1903年《中美通商行船续订条约》中的最惠国待遇条款。中国驻美公使施肇基向最高法院提交意见称，若该法生效，中方可能采取对等反制措施。',
    '**违反正当程序**：根据《菲律宾自治法》第3条（移植自美国宪法第十四修正案），不得未经正当程序剥夺任何人的生命、自由或财产。中文记账是华商的商业习惯和基本经营自由，禁止使用中文记账构成对其财产权利和经营自由的任意剥夺。',
    '**违反平等保护**：该法仅针对性地禁止中文记账（而英文、西班牙文、他加禄语均可使用），是对华商基于国籍和语言的歧视性待遇。在1923年Meyer v. Nebraska案中，最高法院已确立"语言歧视可以作为国籍歧视的表征"的司法先例。',
    '**菲律宾高院越权解释**：菲律宾高等法院将《西文簿记法》的目的解释为"便利税务检查"，是对法律文本的曲解。法院不应行使立法权力来"拯救"一项违宪的法律，目的解释不能超越法律文本的明确含义。',
    '**过度影响经济生活**：该法将严重影响在菲华商的正常经营，导致约5万华侨、15,000家商铺陷入困境，间接影响美国在菲律宾的经济利益。美国商业团体（波特兰商会等）及马尼拉美、英、西、法各国商人均表态支持华商。'
  ],
  
  respondentArguments: [
    '**税收管理需要**：《西文簿记法》的立法目的是便利政府税务稽查，确保商业账簿的真实性和可审查性，并非针对华商的歧视性立法。菲律宾政府组织报纸强调"簿记案为平允之事，乃所以利便政府稽查，固不特施之华商也"。',
    '**可以宽泛解释**：法院应当推定被审查的法律有效。在存在多种解释时，法院应选择不与宪法相抵触的解释。可以将该法解释为"要求商业主体应当采取便利税务检查的簿记方式"，而非禁止中文。',
    '**合理适用税收主权**：菲律宾作为自治政府，享有独立的税收管理权力。规范商业账簿格式属于正当的税收监管措施，不构成对商业自由的不当干涉。',
    '**华商可自行适应**：法律给予华商充分的适应期（原定1921年11月生效，后推迟至1923年1月），华商有足够时间学习外语或聘请翻译人员。',
    '**不违反国际条约**：最惠国待遇条款主要针对关税和贸易条件，不涉及商业记账语言的国内监管事项。记账语言属于国内事务，不受国际条约约束。',
    '**菲律宾高院已裁定合宪**：菲律宾高等法院七位大法官中四人同意、两人反对，裁定该法合宪。该裁决应当得到尊重。'
  ],
  
  disputedIssues: [
    '《西文簿记法》禁止使用中文记账是否构成基于国籍的语言歧视？',
    '法院在司法审查中应当采用文义解释还是目的解释方法？',
    '记账语言监管是否属于正当的税收管理权力范围？',
    '《西文簿记法》是否违反《菲律宾自治法》第3条的正当程序和平等保护条款？',
    '1903年中美通商条约的最惠国待遇条款是否涵盖商业记账语言问题？',
    '最高法院应当如何平衡地方自治与基本权利保护？'
  ],
  
  requestedRelief: {
    claimant: [
      '请求最高法院颁发调卷令审查本案',
      '请求裁定《西文簿记法》因违反《菲律宾自治法》第3条而无效',
      '请求裁定《西文簿记法》因违反美国宪法第十四修正案而违宪',
      '请求撤销菲律宾高等法院及马尼拉初审法院的有罪判决',
      '请求永久禁止菲律宾政府执行《西文簿记法》'
    ],
    respondent: [
      '请求驳回上诉，维持菲律宾高等法院的判决',
      '请求确认《西文簿记法》系为税收管理目的制定的合理监管措施',
      '请求确认菲律宾议会在自治权限范围内享有制定商业监管法律的权力',
      '请求确认该法不违反中美通商条约'
    ]
  },
  
  exhibits: [
    {
      id: 'BE-1',
      description: '1921年《西文簿记法》原文（Bookkeeping Act of 1921）',
      submittedBy: 'claimant',
      summary: '菲律宾议会通过的法律全文，规定商业账簿须以英文、西班牙文或菲律宾本地语言登记，违反者处以罚金及监禁'
    },
    {
      id: 'BE-2',
      description: '华商中文账簿样本（福建闽南语汉字记账）',
      submittedBy: 'claimant',
      summary: '在菲华商普遍使用的传统中文账簿样式，采用"四柱清册"格式，毛笔书写，展示中文记账的合理性'
    },
    {
      id: 'BE-3',
      description: '《菲律宾自治法》第3条（Philippine Autonomy Act §3）',
      submittedBy: 'claimant',
      summary: '"，移植自美国宪法第十四修正案正当程序与平等保护条款'
    },
    {
      id: 'BE-4',
      description: '马尼拉中华商会抗争会议记录（1921-1926）',
      submittedBy: 'claimant',
      summary: '华侨商会筹集十六万七千余元诉讼经费，组织薛敏老、吴克诚赴美上诉的完整会议记录'
    },
    {
      id: 'BE-5',
      description: '中国驻美公使施肇基提交的法律意见',
      submittedBy: 'claimant',
      summary: '施肇基公使代表中国政府向最高法院提交意见书，指出该法可能引发中美贸易报复'
    },
    {
      id: 'BE-6',
      description: '马尼拉初审法院判决书（余孔英案，1923）',
      submittedBy: 'claimant',
      summary: '马尼拉初审法院判决杨孔莺因使用中文记账有罪，处以罚金'
    },
    {
      id: 'BE-7',
      description: '美国联邦最高法院判决书（Yu Cong Eng v. Trinidad, 271 U.S. 500, 1926）',
      submittedBy: 'claimant',
      summary: '塔夫特首席大法官执笔，九位大法官一致裁定《西文簿记法》因违宪而无效'
    },
    {
      id: 'BE-8',
      description: 'Meyer v. Nebraska (262 U.S. 390, 1923) 先例判决',
      submittedBy: 'claimant',
      summary: '最高法院先例：禁止学校在八年级前使用外语教学的法律违宪，"语言歧视可以作为国籍歧视的表征"'
    },
    {
      id: 'BE-9',
      description: '1903年《中美通商行船续订条约》（最惠国待遇条款）',
      submittedBy: 'claimant',
      summary: '条约第5条规定中国商人在美国享有最惠国待遇，该条约效力延伸至菲律宾'
    },
    {
      id: 'RE-1',
      description: '菲律宾税收统计报告（1920-1924）',
      submittedBy: 'respondent',
      summary: '显示华商占菲律宾税收65%的数据，说明税务稽查的必要性'
    },
    {
      id: 'RE-2',
      description: '菲律宾议会立法记录',
      submittedBy: 'respondent',
      summary: '立法过程记录，证明该法系经过正常立法程序制定的税收管理措施'
    },
    {
      id: 'RE-3',
      description: '菲律宾高等法院判决书（G.R. No. 20479, 1925）',
      submittedBy: 'respondent',
      summary: '菲律宾高院以4:2裁定该法合宪，认为可以通过目的解释将其理解为"便利税务检查的措施"'
    },
    {
      id: 'RE-4',
      description: '各国商业记账语言监管制度比较报告',
      submittedBy: 'respondent',
      summary: '当时多国存在对商业记账语言的监管要求，证明该法并非针对华商的特别歧视'
    }
  ],
  
  witnesses: []
};

/**
 * Export all arbitration preset cases
 */
export const ARBITRATION_PRESET_CASES: ArbitrationCase[] = [
  frankfurt2024BellFrance,
  visMoot28GreenTech,
  bookkeepingAct1921
];

/**
 * Get arbitration case by ID
 */
export function getArbitrationCase(id: string): ArbitrationCase | undefined {
  return ARBITRATION_PRESET_CASES.find(c => c.id === id);
}
