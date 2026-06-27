const PARTY_SLUG_ALIASES: Record<string, string> = {
  // Aliases mapping full names/variants to short codes
  bharatiya_janata_party: 'bjp',
  bhartiya_janata_party: 'bjp',
  bharatiya_janata: 'bjp',
  
  indian_national_congress: 'inc',
  congress: 'inc',
  congress_party: 'inc',
  grand_old_party: 'inc',
  
  aam_aadmi_party: 'aap',
  aam_aadmi: 'aap',
  common_man_party: 'aap',
  
  all_india_trinamool_congress: 'tmc',
  trinamool: 'tmc',
  aitc: 'tmc',
  trinamool_congress: 'tmc',
  
  samajwadi_party: 'sp',
  samajwadi: 'sp',
  
  bahujan_samaj_party: 'bsp',
  bahujan_samaj: 'bsp',
  
  dravida_munnetra_kazhagam: 'dmk',
  dravidam: 'dmk',
  
  communist_party_of_india_marxist: 'cpm',
  cpim: 'cpm',
  left_front: 'cpm',
  marxist: 'cpm',
  
  janata_dal_united: 'jdu',
  nitish_party: 'jdu',
  
  nationalist_congress_party: 'ncp',
  nationalist_congress: 'ncp',
  
  telugu_desam_party: 'tdp',
  telugu_desam: 'tdp',
  
  jharkhand_mukti_morcha: 'jmm',
  jharkhand_mukti: 'jmm',
  
  rashtriya_janata_dal: 'rjd',
  rashtriya_janata: 'rjd',
  
  all_india_majlis_e_ittehadul_muslimeen: 'aimim',
  majlis: 'aimim',
  mim: 'aimim',
  
  shiv_sena_eknath_shinde: 'shiv_sena',
  shinde_sena: 'shiv_sena',
  balasahebanchi_shiv_sena: 'shiv_sena',
  
  viduthalai_chiruthaigal_katchi: 'vck',
  
  jammu_and_kashmir_peoples_democratic_party: 'pdp',
  peoples_democratic_party: 'pdp',
  
  all_india_anna_dravida_munnetra_kazhagam: 'aiadmk',
  all_india_anna_dmk: 'aiadmk',
  
  marumalarchi_dravida_munnetra_kazhagam: 'mdmk',
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/ /g, '_').replace(/\./g, '').replace(/[^a-z0-9_]/g, '')
}

export function partySlugify(party: string): string {
  const s = slugify(party)
  return PARTY_SLUG_ALIASES[s] ?? s
}
