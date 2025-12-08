/**
 * 🎯 DATING PHOTO PARAMETERS - MASTER PROMPT BASED
 * 
 * Фіксовані 11 категорій параметрів для реалістичних smartphone dating photos
 * Базується на Seedream 4.0 системі з MASTER PROMPT
 * 
 * Кожна категорія містить 4-6 опцій відповідно до вимог системи
 */

export const DATING_PARAMETERS = {
  /**
   * 1. SMARTPHONE_PHOTO_STYLE
   * Foundation: Device + Era + Filename format
   */
  smartphone_style: [
    'iPhone_14_Pro_HEIC_2023',      // Modern high-quality
    'iPhone_13_HEIC_2022',          // Recent, reliable
    'Pixel_7_JPG_2023',             // Android computational
    'iPhone_12_HEIC_2021',          // Portrait mode era
    'Samsung_S21_JPG_2021',         // Popular Android
    'iPhone_11_HEIC_2020'           // Pre-pandemic aesthetic
  ],

  /**
   * 2. SUBJECT
   * Who: Age range, gender, basic description
   */
  subject: [
    'woman_22_25_casual',           // Young adult, relaxed
    'woman_26_30_confident',        // Late twenties, assured
    'woman_31_35_mature',           // Early thirties, professional
    'man_23_28_athletic',           // Young man, active
    'man_29_35_professional',       // Mature man, polished
    'non_binary_25_30_creative'     // Diverse, artistic
  ],

  /**
   * 3. COMPOSITION
   * How: Shot type, framing, angle
   */
  composition: [
    'close_selfie_slight_angle',    // Classic selfie
    'mirror_selfie_full_body',      // Full mirror shot
    'portrait_medium_rule_thirds',  // Professional casual
    'candid_off_center',            // Natural moment
    'full_body_environmental',      // Context shot
    'tight_portrait_face_focus'     // Close-up emphasis
  ],

  /**
   * 4. BACKGROUND
   * Where: Setting, environment
   */
  background: [
    'bedroom_personal_casual',      // Home, intimate
    'cafe_coffee_shop_ambient',     // Social, relaxed
    'outdoor_park_natural',         // Nature, fresh
    'urban_street_city',            // Urban, energetic
    'home_living_room_cozy',        // Comfortable, warm
    'gym_fitness_active'            // Sporty, healthy
  ],

  /**
   * 5. LIGHTING
   * Light: Source, direction, quality
   */
  lighting: [
    'soft_window_natural',          // Classic natural light
    'golden_hour_outdoor',          // Sunset/sunrise glow
    'soft_lamp_warm_indoor',        // Evening cozy
    'bright_daylight_clear',        // Outdoor, sharp
    'mixed_indoor_outdoor',         // Window + artificial
    'evening_dim_ambient'           // Low-light mood
  ],

  /**
   * 6. COLOR_PALETTE
   * Color: Scheme, saturation, temperature
   */
  color_palette: [
    'warm_golden_saturated',        // Inviting, cozy
    'cool_blue_balanced',           // Modern, clean
    'neutral_natural_tones',        // Realistic, subtle
    'vibrant_high_saturation',      // Energetic, bold
    'faded_low_saturation',         // Vintage, soft
    'mixed_contrast_dynamic'        // Varied, interesting
  ],

  /**
   * 7. MOOD_ATMOSPHERE
   * Feel: Emotional tone, vibe
   */
  mood_atmosphere: [
    'casual_relaxed_authentic',     // Easy-going
    'confident_strong_assured',     // Self-assured
    'playful_fun_lighthearted',     // Cheerful
    'romantic_soft_gentle',         // Tender
    'energetic_active_dynamic',     // Lively
    'mysterious_intriguing_subtle'  // Understated
  ],

  /**
   * 8. MOTION_DYNAMICS
   * Movement: Blur, action, stability
   */
  motion_dynamics: [
    'static_perfectly_sharp',       // No movement
    'slight_motion_blur_natural',   // Realistic movement
    'walking_gentle_motion',        // In action
    'action_freeze_moment',         // Captured movement
    'camera_shake_slight',          // Handheld authentic
    'hair_wind_movement'            // Environmental motion
  ],

  /**
   * 9. DEPTH_FOCUS
   * DOF: Focus point, blur, bokeh
   */
  depth_focus: [
    'portrait_mode_soft_bokeh',     // iPhone portrait
    'all_elements_sharp',           // Everything in focus
    'shallow_dof_subject_focus',    // Subject emphasized
    'background_blur_natural',      // Subtle separation
    'foreground_blur_artistic',     // Creative focus
    'deep_focus_environmental'      // Context visible
  ],

  /**
   * 10. TEXTURE_DETAIL
   * Surface: Skin, materials, detail level
   */
  texture_detail: [
    'skin_natural_pores_visible',   // Realistic skin
    'skin_smooth_subtle_softening', // Light smoothing
    'fabric_texture_visible',       // Clothing detail
    'high_detail_sharp',            // Maximum sharpness
    'soft_detail_gentle',           // Subtle textures
    'environmental_texture_rich'    // Background detail
  ],

  /**
   * 11. TIME_WEATHER
   * When: Time of day, season, conditions
   */
  time_weather: [
    'morning_fresh_bright',         // Early day
    'afternoon_clear_sunny',        // Midday
    'evening_golden_warm',          // Late day
    'cloudy_soft_diffused',         // Overcast
    'indoor_timeless_neutral',      // No time cues
    'night_indoor_artificial'       // Evening inside
  ]
};

/**
 * Get parameter description for natural language
 */
export function getParameterDescription(paramName, value) {
  const descriptions = {
    // SMARTPHONE_STYLE
    'iPhone_14_Pro_HEIC_2023': 'IMG_####.HEIC, iPhone 14 Pro, 2023 modern casual aesthetic',
    'iPhone_13_HEIC_2022': 'IMG_####.HEIC, iPhone 13, 2022 computational photography',
    'Pixel_7_JPG_2023': 'DSC_####.JPG, Google Pixel 7, 2023 natural processing',
    'iPhone_12_HEIC_2021': 'IMG_####.HEIC, iPhone 12, 2021 portrait mode era',
    'Samsung_S21_JPG_2021': 'DSC_####.JPG, Samsung Galaxy S21, 2021 vibrant colors',
    'iPhone_11_HEIC_2020': 'IMG_####.HEIC, iPhone 11, 2020 pre-pandemic aesthetic',

    // SUBJECT
    'woman_22_25_casual': '22-25 year old woman, casual relaxed style',
    'woman_26_30_confident': '26-30 year old woman, confident assured presence',
    'woman_31_35_mature': '31-35 year old woman, mature professional appearance',
    'man_23_28_athletic': '23-28 year old man, athletic build',
    'man_29_35_professional': '29-35 year old man, professional polished look',
    'non_binary_25_30_creative': '25-30 year old person, creative artistic style',

    // COMPOSITION
    'close_selfie_slight_angle': 'close-up selfie from slightly above, arm\'s length',
    'mirror_selfie_full_body': 'full-body mirror selfie, phone visible in frame',
    'portrait_medium_rule_thirds': 'medium shot following rule of thirds',
    'candid_off_center': 'candid shot, subject slightly off-center',
    'full_body_environmental': 'full-body shot with environmental context',
    'tight_portrait_face_focus': 'tight portrait focusing on face and expression',

    // BACKGROUND
    'bedroom_personal_casual': 'personal bedroom setting, casual intimate',
    'cafe_coffee_shop_ambient': 'cafe/coffee shop, ambient social atmosphere',
    'outdoor_park_natural': 'outdoor park setting, natural greenery',
    'urban_street_city': 'urban street scene, city backdrop',
    'home_living_room_cozy': 'home living room, cozy comfortable',
    'gym_fitness_active': 'gym/fitness setting, active healthy environment',

    // LIGHTING
    'soft_window_natural': 'soft natural window light from left side',
    'golden_hour_outdoor': 'golden hour sunlight, warm backlight',
    'soft_lamp_warm_indoor': 'soft warm lamp light, evening ambiance',
    'bright_daylight_clear': 'bright clear daylight, sharp shadows',
    'mixed_indoor_outdoor': 'mixed lighting, window and artificial',
    'evening_dim_ambient': 'dim evening ambient light, low-key',

    // COLOR_PALETTE
    'warm_golden_saturated': 'warm golden tones, moderately saturated',
    'cool_blue_balanced': 'cool blue tones, balanced saturation',
    'neutral_natural_tones': 'neutral natural color palette',
    'vibrant_high_saturation': 'vibrant colors, high saturation',
    'faded_low_saturation': 'faded look, low saturation vintage',
    'mixed_contrast_dynamic': 'mixed colors with dynamic contrast',

    // MOOD_ATMOSPHERE
    'casual_relaxed_authentic': 'casual relaxed mood, authentic feel',
    'confident_strong_assured': 'confident strong presence, self-assured',
    'playful_fun_lighthearted': 'playful fun atmosphere, lighthearted',
    'romantic_soft_gentle': 'romantic soft mood, gentle feel',
    'energetic_active_dynamic': 'energetic active vibe, dynamic',
    'mysterious_intriguing_subtle': 'mysterious intriguing mood, subtle',

    // MOTION_DYNAMICS
    'static_perfectly_sharp': 'perfectly still, sharp focus throughout',
    'slight_motion_blur_natural': 'slight natural motion blur',
    'walking_gentle_motion': 'gentle walking motion captured',
    'action_freeze_moment': 'action frozen at peak moment',
    'camera_shake_slight': 'slight camera shake, handheld authentic',
    'hair_wind_movement': 'hair movement from wind, dynamic',

    // DEPTH_FOCUS
    'portrait_mode_soft_bokeh': 'portrait mode with soft background bokeh',
    'all_elements_sharp': 'all elements in focus, deep DOF',
    'shallow_dof_subject_focus': 'shallow depth of field, subject sharp',
    'background_blur_natural': 'background naturally blurred',
    'foreground_blur_artistic': 'foreground blur for artistic effect',
    'deep_focus_environmental': 'deep focus showing environmental context',

    // TEXTURE_DETAIL
    'skin_natural_pores_visible': 'natural skin texture, pores subtly visible',
    'skin_smooth_subtle_softening': 'skin with subtle smoothing, natural',
    'fabric_texture_visible': 'fabric texture clearly visible',
    'high_detail_sharp': 'high detail throughout, crisp sharpness',
    'soft_detail_gentle': 'soft detail, gentle rendering',
    'environmental_texture_rich': 'rich environmental texture and detail',

    // TIME_WEATHER
    'morning_fresh_bright': 'fresh morning light, bright and clear',
    'afternoon_clear_sunny': 'clear sunny afternoon, strong light',
    'evening_golden_warm': 'evening golden hour, warm atmosphere',
    'cloudy_soft_diffused': 'cloudy conditions, soft diffused light',
    'indoor_timeless_neutral': 'indoor setting, neutral timeless feel',
    'night_indoor_artificial': 'night time indoors, artificial lighting'
  };

  return descriptions[value] || value;
}

/**
 * Get imperfection suggestions based on style
 */
export function getImperfections(style) {
  const imperfectionSets = {
    'iPhone_14_Pro_HEIC_2023': [
      'slight overexposure on highlights',
      'minor portrait mode edge artifacts around hair',
      'subtle lens flare in corner'
    ],
    'iPhone_13_HEIC_2022': [
      'slight motion blur on hands',
      'horizon tilted 2 degrees',
      'top of head slightly cut off'
    ],
    'Pixel_7_JPG_2023': [
      'slight chromatic aberration',
      'overprocessed HDR in background',
      'minor compression artifacts'
    ],
    'iPhone_12_HEIC_2021': [
      'background photobomb visible',
      'slight camera shake',
      'uneven exposure'
    ],
    'Samsung_S21_JPG_2021': [
      'oversaturated colors typical of Samsung',
      'slight purple fringing',
      'aggressive sharpening visible'
    ],
    'iPhone_11_HEIC_2020': [
      'visible noise in shadows',
      'slight blur from movement',
      'awkward framing'
    ]
  };

  const defaultImperfections = [
    'slight motion blur',
    'subject slightly off-center',
    'minor overexposure on one side'
  ];

  const styleImperfections = imperfectionSets[style] || defaultImperfections;
  
  // Return 1-3 random imperfections
  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...styleImperfections].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default {
  DATING_PARAMETERS,
  getParameterDescription,
  getImperfections
};










