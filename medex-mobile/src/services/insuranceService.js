/**
 * insuranceService.js
 * Fetches insurance data from Supabase tables:
 *   insurance_providers, insurance_plans, plan_benefits,
 *   plan_pricing, plan_restrictions
 *
 * Falls back to embedded mock data when Supabase is unavailable.
 */

import { supabase } from '../config/supabase';

// ─────────────────────────────────────────────
// MOCK FALLBACK DATA
// ─────────────────────────────────────────────

const MOCK_PROVIDERS = [
  {
    provider_id: 1,
    provider_name: 'Ayushman Bharat – PM-JAY',
    contact_info: '14555',
    logo_url: null,
    created_at: null,
    type: 'government',
    plans: [
      {
        plan_id: 101,
        plan_name: 'PM-JAY Standard',
        plan_type: 'Government',
        network_size_tier: 'Large',
        pricing: {
          base_premium_amount: 0,
          individual_deductible: 0,
          family_deductible: 0,
          out_of_pocket_maximum: 0,
          copay_amount: 0,
        },
        benefits: [
          { benefit_name: 'Hospitalization', coverage_details: 'Up to ₹5,00,000 per year', is_essential: true },
          { benefit_name: 'Pre & Post Hospitalization', coverage_details: '15 days pre, 30 days post', is_essential: true },
          { benefit_name: 'Day Care Procedures', coverage_details: '1,929+ procedures covered', is_essential: true },
          { benefit_name: 'Mental Health', coverage_details: 'Covered under PMJAY', is_essential: false },
        ],
        restrictions: [
          { restriction_type: 'Eligibility', description: 'BPL & low-income families only' },
          { restriction_type: 'Geography', description: 'Pan India' },
        ],
      },
    ],
  },
  {
    provider_id: 2,
    provider_name: 'Tamil Nadu CM Health Insurance',
    contact_info: '044-28592828',
    logo_url: null,
    created_at: null,
    type: 'government',
    plans: [
      {
        plan_id: 201,
        plan_name: 'CMCHIS Standard',
        plan_type: 'Government',
        network_size_tier: 'Medium',
        pricing: {
          base_premium_amount: 0,
          individual_deductible: 0,
          family_deductible: 0,
          out_of_pocket_maximum: 0,
          copay_amount: 0,
        },
        benefits: [
          { benefit_name: 'Hospitalization', coverage_details: 'Up to ₹5,00,000 per year', is_essential: true },
          { benefit_name: 'Free Diagnostics', coverage_details: 'All diagnostics at govt hospitals', is_essential: true },
          { benefit_name: 'Free Medicines', coverage_details: 'Covered at empanelled hospitals', is_essential: true },
        ],
        restrictions: [
          { restriction_type: 'Eligibility', description: 'TN residents with annual income ≤ ₹72,000' },
          { restriction_type: 'Geography', description: 'Tamil Nadu only' },
        ],
      },
    ],
  },
  {
    provider_id: 3,
    provider_name: 'Star Health Insurance',
    contact_info: '1800-425-2255',
    logo_url: null,
    created_at: null,
    type: 'private',
    plans: [
      {
        plan_id: 301,
        plan_name: 'Family Health Optima',
        plan_type: 'Family Floater',
        network_size_tier: 'Extra Large',
        pricing: {
          base_premium_amount: 15000,
          individual_deductible: 2000,
          family_deductible: 5000,
          out_of_pocket_maximum: 50000,
          copay_amount: 500,
        },
        benefits: [
          { benefit_name: 'Cashless Hospitalization', coverage_details: '14,000+ hospitals', is_essential: true },
          { benefit_name: 'No Claim Bonus', coverage_details: 'Up to 100% of sum insured', is_essential: false },
          { benefit_name: 'Day Care Procedures', coverage_details: 'All day care treatments', is_essential: true },
          { benefit_name: 'Ambulance Cover', coverage_details: '₹2,000 per hospitalization', is_essential: false },
        ],
        restrictions: [
          { restriction_type: 'Age', description: '16 days – 65 years' },
          { restriction_type: 'Waiting Period', description: '30 days for new policies' },
        ],
      },
    ],
  },
  {
    provider_id: 4,
    provider_name: 'Niva Bupa Health Insurance',
    contact_info: '1800-200-7878',
    logo_url: null,
    created_at: null,
    type: 'private',
    plans: [
      {
        plan_id: 401,
        plan_name: 'ReAssure 2.0',
        plan_type: 'Individual/Family',
        network_size_tier: 'Large',
        pricing: {
          base_premium_amount: 12000,
          individual_deductible: 1500,
          family_deductible: 4000,
          out_of_pocket_maximum: 40000,
          copay_amount: 300,
        },
        benefits: [
          { benefit_name: 'Lock the Clock Premium', coverage_details: 'No age-based premium hike', is_essential: true },
          { benefit_name: 'Unlimited Restore', coverage_details: 'Unlimited sum insured restoration', is_essential: true },
          { benefit_name: 'OPD Cover', coverage_details: 'Available as add-on', is_essential: false },
          { benefit_name: 'Mental Illness Cover', coverage_details: 'Covered as per IRDAI mandate', is_essential: true },
        ],
        restrictions: [
          { restriction_type: 'Age', description: '18 – 65 years' },
          { restriction_type: 'Waiting Period', description: '30 days general, 2–4 years for pre-existing' },
        ],
      },
    ],
  },
  {
    provider_id: 5,
    provider_name: 'HDFC ERGO General Insurance',
    contact_info: '1800-2700-700',
    logo_url: null,
    created_at: null,
    type: 'private',
    plans: [
      {
        plan_id: 501,
        plan_name: 'Optima Secure',
        plan_type: 'Individual/Family',
        network_size_tier: 'Large',
        pricing: {
          base_premium_amount: 18000,
          individual_deductible: 2500,
          family_deductible: 6000,
          out_of_pocket_maximum: 60000,
          copay_amount: 400,
        },
        benefits: [
          { benefit_name: 'Secure Benefit', coverage_details: '2x base cover from day 1', is_essential: true },
          { benefit_name: 'Plus Benefit', coverage_details: '50% annual addition to cover', is_essential: true },
          { benefit_name: 'AYUSH Treatment', coverage_details: 'Ayurveda, Yoga, Unani, Siddha, Homeopathy', is_essential: false },
          { benefit_name: 'Global Coverage', coverage_details: 'Available as add-on', is_essential: false },
        ],
        restrictions: [
          { restriction_type: 'Age', description: '91 days – 65 years' },
          { restriction_type: 'Waiting Period', description: '30 days general, 3 years pre-existing' },
        ],
      },
    ],
  },
  {
    provider_id: 6,
    provider_name: 'New India Assurance',
    contact_info: '1800-209-1415',
    logo_url: null,
    created_at: null,
    type: 'psu',
    plans: [
      {
        plan_id: 601,
        plan_name: 'Mediclaim 2012',
        plan_type: 'Individual',
        network_size_tier: 'Medium',
        pricing: {
          base_premium_amount: 8000,
          individual_deductible: 1000,
          family_deductible: 2500,
          out_of_pocket_maximum: 30000,
          copay_amount: 200,
        },
        benefits: [
          { benefit_name: 'Room Rent', coverage_details: 'Single AC room covered', is_essential: true },
          { benefit_name: 'ICU Charges', coverage_details: 'Full ICU charges covered', is_essential: true },
          { benefit_name: 'Surgical Expenses', coverage_details: 'All listed surgeries', is_essential: true },
          { benefit_name: 'Ambulance Charges', coverage_details: '₹1,500 per hospitalisation', is_essential: false },
        ],
        restrictions: [
          { restriction_type: 'Age', description: '18 – 65 years, lifelong renewal' },
          { restriction_type: 'Waiting Period', description: '30 days, 2 years for specific illnesses' },
        ],
      },
    ],
  },
];

const MOCK_TIPS = [
  { icon: 'bulb-outline', text: 'Compare plans annually — your health needs change over time.' },
  { icon: 'document-text-outline', text: 'Always disclose pre-existing conditions to avoid claim rejection.' },
  { icon: 'cash-outline', text: 'Higher deductible = lower premium. Choose wisely based on your risk.' },
  { icon: 'shield-outline', text: "Check if your preferred hospital is in the insurer's network." },
];

// ─────────────────────────────────────────────
// TYPE COLOUR MAPPING (shared by provider cards)
// ─────────────────────────────────────────────

export const PROVIDER_TYPE_META = {
  government: { label: 'Government', color: '#065F46', colorLight: '#D1FAE5', badgeBg: '#DCFCE7', badgeColor: '#15803D', icon: 'shield-checkmark' },
  private: { label: 'Private', color: '#6D28D9', colorLight: '#EDE9FE', badgeBg: '#EDE9FE', badgeColor: '#6D28D9', icon: 'briefcase' },
  psu: { label: 'PSU', color: '#B45309', colorLight: '#FEF3C7', badgeBg: '#FEF3C7', badgeColor: '#B45309', icon: 'ribbon' },
};

// ─────────────────────────────────────────────
// REMOTE FETCH FUNCTIONS (Supabase)
// ─────────────────────────────────────────────

/**
 * Generic helper to run a Supabase query and fall back to mock data.
 */
async function safeQuery(queryPromise, fallback) {
  if (!supabase) return fallback;
  const { data, error } = await queryPromise;
  if (error) {
    console.warn('Supabase query failed, falling back to mock data:', error);
    return fallback;
  }
  return data;
}

/** Fetch all insurance providers from Supabase. */
export async function fetchProviders() {
  return safeQuery(supabase.from('insurance_providers').select('*').order('provider_name'), MOCK_PROVIDERS);
}

/** Fetch plans for a given provider. */
export async function fetchPlansByProvider(providerId) {
  return safeQuery(
    supabase.from('insurance_plans').select('*').eq('provider_id', providerId),
    []
  );
}

/** Fetch pricing details for a plan. */
export async function fetchPricingByPlan(planId) {
  return safeQuery(
    supabase.from('plan_pricing').select('*').eq('plan_id', planId),
    []
  );
}

/** Fetch benefits for a plan. */
export async function fetchBenefitsByPlan(planId) {
  return safeQuery(
    supabase.from('plan_benefits').select('*').eq('plan_id', planId),
    []
  );
}

/** Fetch restrictions for a plan. */
export async function fetchRestrictionsByPlan(planId) {
  return safeQuery(
    supabase.from('plan_restrictions').select('*').eq('plan_id', planId),
    []
  );
}

/**
 * Retrieve a full provider object with nested plans, each enriched with pricing,
 * benefits and restrictions.
 */
export async function getProviderDetail(providerId) {
  const providers = await fetchProviders();
  console.log(providers);
  const provider = providers.find(p => p.provider_id === providerId);
  if (!provider) return null;

  const plans = await fetchPlansByProvider(providerId);
  const enrichedPlans = await Promise.all(
    plans.map(async plan => {
      const [pricing, benefits, restrictions] = await Promise.all([
        fetchPricingByPlan(plan.plan_id),
        fetchBenefitsByPlan(plan.plan_id),
        fetchRestrictionsByPlan(plan.plan_id),
      ]);
      return { ...plan, pricing: pricing[0] || {}, benefits, restrictions };
    })
  );

  return { ...provider, plans: enrichedPlans };
}

// ─────────────────────────────────────────────
// HELPER – SUPABASE JOIN QUERY
// ─────────────────────────────────────────────

async function fetchProvidersFromSupabase() {
  if (!supabase) {
    console.warn(
      '[insuranceService] Supabase client is not initialized. Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are configured in your .env file.'
    );
    return null;
  }

  try {
    // 1. Fetch providers
    const { data: providers, error: pErr } = await supabase
      .from('insurance_providers')
      .select('*')
      .order('provider_name');

    if (pErr) {
      console.error('[insuranceService] Error fetching insurance_providers:', pErr);
      return null;
    }

    if (!providers || providers.length === 0) {
      console.warn('[insuranceService] Supabase returned 0 insurance_providers. Check table data and Row Level Security (RLS) policies.');
      return null;
    }

    // 2. Fetch plans (optional - providers can still be displayed if plans are not yet added)
    const { data: plans, error: plErr } = await supabase
      .from('insurance_plans')
      .select('*');

    if (plErr) {
      console.warn('[insuranceService] Could not fetch insurance_plans (or table empty):', plErr.message);
    }

    const planList = plans || [];
    const planIds = planList.map(p => p.plan_id).filter(Boolean);

    // 3. Fetch benefits, pricing, restrictions in parallel ONLY if planIds exist
    let benefits = [];
    let pricing = [];
    let restrictions = [];

    if (planIds.length > 0) {
      const [bRes, prRes, rRes] = await Promise.all([
        supabase.from('plan_benefits').select('*').in('plan_id', planIds),
        supabase.from('plan_pricing').select('*').in('plan_id', planIds),
        supabase.from('plan_restrictions').select('*').in('plan_id', planIds),
      ]);

      benefits = bRes.data || [];
      pricing = prRes.data || [];
      restrictions = rRes.data || [];
    }

    // 4. Join data
    const enrichedPlans = planList.map(plan => ({
      ...plan,
      benefits: benefits.filter(b => b.plan_id === plan.plan_id),
      pricing: pricing.find(p => p.plan_id === plan.plan_id) || null,
      restrictions: restrictions.filter(r => r.plan_id === plan.plan_id),
    }));

    return providers.map(prov => ({
      ...prov,
      type: prov.type || 'private',
      plans: enrichedPlans.filter(pl => pl.provider_id === prov.provider_id),
    }));
  } catch (err) {
    console.error('[insuranceService] Unexpected error in fetchProvidersFromSupabase:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

export const insuranceService = {
  fetchProviders,
  fetchPlansByProvider,
  fetchPricingByPlan,
  fetchBenefitsByPlan,
  fetchRestrictionsByPlan,
  getProviderDetail,

  /**
   * Returns full provider list with nested plans/benefits/pricing/restrictions.
   * Tries Supabase first; falls back to mock data.
   */
  async getProviders({ searchQuery = '', filterType = 'all' } = {}) {
    let providers = await fetchProvidersFromSupabase();
    if (!providers) providers = MOCK_PROVIDERS;

    if (filterType !== 'all') {
      providers = providers.filter(p => (p.type || 'private') === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      providers = providers.filter(
        p =>
          p.provider_name.toLowerCase().includes(q) ||
          (p.contact_info || '').toLowerCase().includes(q) ||
          p.plans?.some(pl => pl.plan_name?.toLowerCase().includes(q))
      );
    }

    return providers;
  },

  /**
   * Returns all plans (flattened with provider info) suitable for comparison.
   * Tries Supabase first; falls back to mock data.
   */
  async getPlansForComparison() {
    let providers = await fetchProvidersFromSupabase();
    if (!providers) providers = MOCK_PROVIDERS;

    const flatPlans = [];
    providers.forEach(prov => {
      (prov.plans || []).forEach(plan => {
        flatPlans.push({
          ...plan,
          provider_name: prov.provider_name,
          provider_type: prov.type || 'private',
          contact_info: prov.contact_info,
        });
      });
    });

    return flatPlans;
  },

  getTips: () => MOCK_TIPS,
};

export default insuranceService;
