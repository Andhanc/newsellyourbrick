import {
  Building2,
  MapPin,
  FileText,
  Sparkles,
  Car,
  Gavel,
  TrendingUp,
  Lightbulb,
  Lock,
  CalendarCheck,
} from 'lucide-react'
import { OAP_PARAMS_IMAGES } from './oapParamsImages'
import { OAP_DESCRIPTION_IMAGES } from './oapDescriptionImages'
import { OAP_AMENITIES_IMAGES } from './oapAmenitiesImages'
import { OAP_LISTING_IMAGES } from './oapListingImages'
import { OAP_TESTDRIVE_IMAGES } from './oapTestdriveImages'
import { OAP_CALCULATOR_IMAGES } from './oapCalculatorImages'
import { OAP_DOCUMENT_IMAGES } from './oapDocumentImages'

export const OAP_WIZARD_STEP_VISUALS = {
  1: {
    accent: 'teal',
    image: OAP_PARAMS_IMAGES.sidebarHero,
    stepLabelKey: 'oap_aside_stepOf',
    stepLabelParams: { current: 1, total: 5 },
    eyebrowKey: 'oap_aside_basicsEyebrow',
    leadKey: 'oap_aside_basicsLead',
    tipsTitleKey: 'oap_aside_basicsTipsTitle',
    tips: [
      {
        Icon: Building2,
        tone: 'tiffany',
        titleKey: 'oap_aside_basicsTipTypeTitle',
        textKey: 'oap_aside_basicsTipTypeText',
      },
      {
        Icon: MapPin,
        tone: 'tiffany-soft',
        titleKey: 'oap_aside_basicsTipAddressTitle',
        textKey: 'oap_aside_basicsTipAddressText',
      },
    ],
  },
}

export const OAP_BASICS_ROW_ASIDES = {
  type: {
    accent: 'teal',
    image: OAP_PARAMS_IMAGES.sidebarHero,
    stepLabelKey: 'oap_aside_stepOf',
    stepLabelParams: { current: 1, total: 5 },
    eyebrowKey: 'oap_aside_basicsEyebrow',
    leadKey: 'oap_aside_basicsLead',
    tipsTitleKey: 'oap_aside_basicsTipsTitle',
    tips: [OAP_WIZARD_STEP_VISUALS[1].tips[0]],
  },
  params: {
    accent: 'teal',
    image: OAP_PARAMS_IMAGES.characteristicsHero,
    eyebrowKey: 'oap_aside_paramsEyebrow',
    leadKey: 'oap_aside_paramsLead',
    tipsTitleKey: 'oap_aside_tipAdvice',
    tips: [
      {
        Icon: Building2,
        tone: 'tiffany',
        titleKey: 'oap_aside_paramsTipTitle',
        textKey: 'oap_aside_paramsTipText',
      },
    ],
  },
}

const OAP_PRESENTATION_COPY_ASIDE = {
  accent: 'violet',
  image: OAP_DESCRIPTION_IMAGES.sidebarHero,
  eyebrowKey: 'oap_aside_presentationEyebrow',
  leadKey: 'oap_aside_presentationLead',
  tipsTitleKey: 'oap_aside_presentationTipsTitle',
  tips: [
    {
      Icon: Sparkles,
      tone: 'tiffany',
      titleKey: 'oap_aside_presentationTipTitle',
      textKey: 'oap_aside_presentationTipText',
    },
  ],
}

export const OAP_PRESENTATION_ROW_ASIDES = {
  copy: OAP_PRESENTATION_COPY_ASIDE,
  amenities: {
    accent: 'violet',
    image: OAP_AMENITIES_IMAGES.sidebarInterior,
    eyebrowKey: 'oap_aside_amenitiesEyebrow',
    leadKey: 'oap_aside_amenitiesLead',
    tipsTitleKey: 'oap_aside_tipAdvice',
    tips: [
      {
        Icon: Sparkles,
        tone: 'tiffany',
        titleKey: 'oap_aside_amenitiesTipFiltersTitle',
        textKey: 'oap_aside_amenitiesTipFiltersText',
      },
      {
        Icon: Lightbulb,
        tone: 'tiffany-soft',
        titleKey: 'oap_aside_amenitiesTipManualTitle',
        textKey: 'oap_aside_amenitiesTipManualText',
      },
    ],
  },
}

const OAP_FINANCE_STEP_ASIDE = {
  accent: 'teal',
  image: OAP_CALCULATOR_IMAGES.sidebarHero,
  stepLabelKey: 'oap_aside_stepOf',
  stepLabelParams: { current: 4, total: 5 },
  highlightKeys: ['oap_aside_financeHighlightEstimate', 'oap_aside_financeHighlightSections'],
  eyebrowKey: 'oap_aside_financeEyebrow',
  leadKey: 'oap_aside_financeLead',
  tipsTitleKey: 'oap_aside_financeTipsTitle',
  tips: [
    {
      Icon: TrendingUp,
      tone: 'tiffany',
      titleKey: 'oap_aside_financeTipEstimateTitle',
      textKey: 'oap_aside_financeTipEstimateText',
    },
    {
      Icon: Lightbulb,
      tone: 'tiffany-soft',
      titleKey: 'oap_aside_financeTipPriceTitle',
      textKey: 'oap_aside_financeTipPriceText',
    },
  ],
}

export const OAP_FINANCE_ROW_ASIDES = {
  calculator: {
    accent: 'teal',
    image: OAP_CALCULATOR_IMAGES.sidebarHero,
    eyebrowKey: 'oap_aside_calcEyebrow',
    leadKey: 'oap_aside_calcLead',
    tipsTitleKey: 'oap_aside_tipAdvice',
    tips: [OAP_FINANCE_STEP_ASIDE.tips[0]],
  },
  pricing: {
    accent: 'teal',
    image: OAP_CALCULATOR_IMAGES.pricingPublicationHero,
    eyebrowKey: 'oap_aside_pricingEyebrow',
    leadKey: 'oap_aside_pricingLead',
    tipsTitleKey: 'oap_aside_tipAdvicePlural',
    tips: [
      {
        Icon: Lightbulb,
        tone: 'tiffany',
        titleKey: 'oap_aside_financeTipPriceTitle',
        textKey: 'oap_aside_financeTipPriceText',
      },
      {
        Icon: CalendarCheck,
        tone: 'tiffany-soft',
        titleKey: 'oap_aside_pricingTipTermTitle',
        textKey: 'oap_aside_pricingTipTermText',
      },
    ],
  },
}

const OAP_STRATEGY_STEP_ASIDE = {
  accent: 'amber',
  image: OAP_LISTING_IMAGES.sidebarHero,
  stepLabelKey: 'oap_aside_stepOf',
  stepLabelParams: { current: 3, total: 5 },
  highlightKeys: ['oap_aside_strategyHighlightFormats', 'oap_aside_strategyHighlightTd'],
  eyebrowKey: 'oap_aside_strategyEyebrow',
  leadKey: 'oap_aside_strategyLead',
  tipsTitleKey: 'oap_aside_strategyTipsTitle',
  tips: [
    {
      Icon: Car,
      tone: 'tiffany',
      titleKey: 'oap_aside_strategyTipTdTitle',
      textKey: 'oap_aside_strategyTipTdText',
    },
    {
      Icon: Gavel,
      tone: 'tiffany-soft',
      titleKey: 'oap_aside_strategyTipFormatTitle',
      textKey: 'oap_aside_strategyTipFormatText',
    },
  ],
}

export const OAP_STRATEGY_ROW_ASIDES = {
  testdrive: {
    accent: 'teal',
    image: OAP_TESTDRIVE_IMAGES.sidebarHero,
    eyebrowKey: 'oap_aside_tdEyebrow',
    leadKey: 'oap_aside_tdLead',
    tipsTitleKey: 'oap_aside_tipAdvice',
    tips: [OAP_STRATEGY_STEP_ASIDE.tips[0]],
  },
}

Object.assign(OAP_WIZARD_STEP_VISUALS, {
  2: OAP_PRESENTATION_COPY_ASIDE,
  3: OAP_STRATEGY_STEP_ASIDE,
  4: OAP_FINANCE_STEP_ASIDE,
  5: {
    accent: 'teal',
    image: OAP_DOCUMENT_IMAGES.sidebarHero,
    stepLabelKey: 'oap_aside_stepOf',
    stepLabelParams: { current: 5, total: 5 },
    highlightKeys: ['oap_aside_docsHighlightModeration', 'oap_aside_docsHighlightSafe'],
    eyebrowKey: 'oap_aside_docsEyebrow',
    leadKey: 'oap_aside_docsLead',
    tipsTitleKey: 'oap_aside_docsTipsTitle',
    tips: [
      {
        Icon: FileText,
        tone: 'tiffany',
        titleKey: 'oap_aside_docsTipScanTitle',
        textKey: 'oap_aside_docsTipScanText',
      },
      {
        Icon: CalendarCheck,
        tone: 'tiffany-soft',
        titleKey: 'oap_aside_docsTipFastTitle',
        textKey: 'oap_aside_docsTipFastText',
      },
      {
        Icon: Lock,
        tone: 'tiffany-muted',
        titleKey: 'oap_aside_docsTipPrivacyTitle',
        textKey: 'oap_aside_docsTipPrivacyText',
      },
    ],
    help: {
      titleKey: 'oap_aside_docsHelpTitle',
      textKey: 'oap_aside_docsHelpText',
    },
  },
})
