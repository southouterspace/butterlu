// The store's catalog: one configurable frame (shape, background and the words on each
// side are choices), sold through search-intent pages that each preset it. Every pageKey here
// is a row with build: true in plans/decisions.json (PROPOSED, gate G2). The first page
// listed for a pageKey is its main page and takes the cluster's old Shopify URLs; later
// pages on the same pageKey are extra exact-search pages (docs/12 §4). Every page
// sells at one price, FRAME_PRICE_CENTS, set by the owner.
//
// This file is plain TypeScript with no Astro imports, so the checkout Worker reads
// the same prices and handles the pages render.
import type { FrameSpec } from '@butterlu/frame';

export interface Product {
  /** URL slug: /products/<handle>. Old Shopify handles 301 here (public/_redirects). */
  handle: string;
  /**
   * 'frame' for the one real product, the plain frame. Everything else is a
   * design: one frame preset for one search (godmother, Mimi, ultrasound), sold as that
   * frame and marked up as its variant (docs/12 §4b).
   */
  kind?: 'frame';
  /** plans/clusters.json pageKey and clusterId this page builds. */
  pageKey: string;
  clusterId: string;
  /** Etsy listing whose wording and look seeded the preset. None on the frame. */
  etsyListingId?: number;
  name: string;
  /** Without the " | Butterlu" suffix; lint-dist checks the rendered title fits 60 chars. */
  seoTitle: string;
  seoDescription: string;
  /** One or two sentences under the heading. */
  intro: string;
  /** Who it's for and when, as short bullet points. */
  goodFor: string[];
  priceCents: number;
  /** The frame as designed. A customer can buy it as is or change any part of it. */
  preset: FrameSpec;
  collections: string[];
}

export interface Collection {
  /** URL slug: /collections/<handle>. Kept identical to the Shopify collection where one existed. */
  handle: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
}

export const CURRENCY = 'usd';
/**
 * One price for the frame and every design on it. The owner set $39 with free
 * US shipping (2026-11-08).
 */
export const FRAME_PRICE_CENTS = 3900;
export const SHOP = {
  name: 'Butterlu',
  /** Shown on product pages and the shipping page. Free US shipping is the owner's call (2026-11-08); the dispatch time is PROPOSED. */
  dispatch: 'Made to order and shipped within 3 to 5 business days',
  shipping: 'Free shipping in the US',
  photoNote: 'Holds a 4x6 photo. The frame ships without a photo, ready for yours.',
};

const script = 'great-vibes';
const serif = 'playfair-display-bold';
const sans = 'montserrat-semibold';

export const COLLECTIONS: Collection[] = [
  {
    handle: 'grandparent-frames',
    name: 'Grandparent Frames',
    seoTitle: 'Personalized Grandparent Picture Frames',
    seoDescription: 'Personalized picture frames for grandma and grandpa: birthdays, Christmas, Father’s Day and pregnancy reveals. With their names and your words.',
    intro: 'For Mimi, Gigi, Papa and every name in between.',
  },
  {
    handle: 'new-grandparent-to-be',
    name: 'Pregnancy Announcement Frames',
    seoTitle: 'Pregnancy Announcement Frames for Grandparents',
    seoDescription: 'Ultrasound picture frames to tell grandparents, great-grandparents and family the news. Personalized wording, ships ready for your sonogram.',
    intro: 'The frame for the moment you tell them.',
  },
  {
    handle: 'godparent-frames',
    name: 'Godparent Frames',
    seoTitle: 'Godparent Frames for Baptisms and Proposals',
    seoDescription: 'Godmother and godfather picture frames for baptisms, christenings and asking the question. Add the baby’s name, your wording and the date.',
    intro: 'Ask them to be godparents, or thank them on the day.',
  },
  {
    handle: 'wedding-thank-you-frames',
    name: 'Wedding Frames',
    seoTitle: 'Personalized Wedding Picture Frames',
    seoDescription: 'Wedding picture frames for the parents of the bride and groom, and engagement frames for the couple. Personalized, made to order.',
    intro: 'Thank-you frames for the parents, keepsakes for the couple.',
  },
  {
    handle: 'aunt-uncle-frames',
    name: 'Aunt & Uncle Frames',
    seoTitle: 'Personalized Aunt and Uncle Picture Frames',
    seoDescription: 'Personalized picture frames for aunts and uncles: birthdays, new nieces and nephews, and just because. Their names, your words.',
    intro: 'For the aunt and uncle who show up for everything.',
  },
  {
    handle: 'baby-frames',
    name: 'Baby Frames',
    seoTitle: 'Personalized Baby and Ultrasound Picture Frames',
    seoDescription: 'Baby name frames, twin ultrasound frames and newborn keepsakes. Add the name, birth date or due date, and see it before you buy.',
    intro: 'From the first sonogram to the first photo home.',
  },
  {
    handle: 'pet-loss-memorial',
    name: 'Pet Memorial Frames',
    seoTitle: 'Personalized Pet Memorial Picture Frames',
    seoDescription: 'Pet memorial picture frames for a dog or cat you miss. Add their name and years, choose a background, and frame a favorite photo.',
    intro: 'For the dog or cat who was family.',
  },
];

/** The one product Butterlu sells. Every design page is this frame with a preset; shape is a choice on it. */
const FRAME_PAGES: Product[] = [
  {
    handle: 'personalized-picture-frame',
    kind: 'frame',
    pageKey: 'frame/any',
    clusterId: 'F01',
    name: 'Personalized Picture Frame',
    seoTitle: 'Personalized Picture Frame in Your Own Words',
    seoDescription: 'A personalized 4x6 picture frame for any person or occasion. Add their names, a date or your own words and see it before you buy. Free US shipping.',
    intro: 'Your design, start to finish.',
    goodFor: ['Any occasion, in your own words', 'Family, friends and home', 'Starting from a plain frame'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'blush-checkers',
      sides: { top: { text: 'Our Happy Place', fontId: script }, bottom: { text: 'Est. 2026', fontId: sans } },
    },
    collections: [],
  },
];

const DESIGN_PAGES: Product[] = [
  {
    handle: 'grandparent-pregnancy-announcement-frame',
    pageKey: 'frame/grandparents-to-be/announcement',
    clusterId: 'P001',
    etsyListingId: 693902312,
    name: 'Grandparent Pregnancy Announcement Frame',
    seoTitle: 'Grandparent Pregnancy Announcement Frame',
    seoDescription: 'Tell them they’re going to be grandparents. A personalized ultrasound picture frame with your wording, the due date and the names they’ll go by.',
    intro: 'The reveal that ends in happy tears.',
    goodFor: ['Telling your parents the news', 'First grandchild reveals', 'Ultrasound or sonogram photos'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'sage-stripes',
      sides: { top: { text: 'Promoted to Grandparents', fontId: script }, bottom: { text: 'Coming 2027', fontId: sans } },
    },
    collections: ['new-grandparent-to-be', 'grandparent-frames'],
  },
  {
    handle: 'father-of-the-bride-frame',
    pageKey: 'frame/parents-of-couple/wedding',
    clusterId: 'P002',
    etsyListingId: 512288952,
    name: 'Father of the Bride Wedding Frame',
    seoTitle: 'Father of the Bride Wedding Picture Frame',
    seoDescription: 'A personalized father of the bride picture frame, or one for mom or both sets of parents. Your words and your wedding date, made to order.',
    intro: 'A thank-you for the people who got you here.',
    goodFor: ['Father or mother of the bride', 'Parents of the groom', 'Wedding thank-you gifts'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'white-linen',
      sides: { top: { text: 'Dad, I Loved You First', fontId: script }, bottom: { text: 'Love, the Bride', fontId: serif } },
    },
    collections: ['wedding-thank-you-frames'],
  },
  {
    handle: 'personalized-grandma-frame',
    pageKey: 'frame/grandma/everyday',
    clusterId: 'P003',
    etsyListingId: 795301379,
    name: 'Personalized Grandma Frame',
    seoTitle: 'Personalized Grandma Frame: Mimi, Gigi, Nana',
    seoDescription: 'A personalized picture frame for grandma with the name the grandkids call her. Mimi, Gigi, Nana or your own. Made to order.',
    intro: 'Mimi, Gigi, Nana, Grammy: put her name on it.',
    goodFor: ['Mother’s Day and birthdays', 'Gifts from the grandkids', 'Any grandma name'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'blush-checkers',
      sides: { top: { text: 'I Love My Mimi', fontId: script } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'godmother-proposal-frame',
    pageKey: 'frame/godmother/proposal',
    clusterId: 'P004',
    etsyListingId: 506350688,
    name: 'Godmother Proposal Frame',
    seoTitle: 'Will You Be My Godmother Proposal Frame',
    seoDescription: 'A godmother proposal frame that asks the question for you. Add the baby’s name, your own wording and a photo of the baby. Made to order.',
    intro: 'The sweetest way to ask.',
    goodFor: ['Asking a godmother', 'Baptism and christening plans', 'A keepsake she’ll keep'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'blush-stripes',
      sides: { top: { text: 'Will You Be My Godmother?', fontId: script } },
    },
    collections: ['godparent-frames'],
  },
  {
    handle: 'godfather-baptism-frame',
    pageKey: 'frame/godfather/baptism',
    clusterId: 'P005',
    etsyListingId: 503492874,
    name: 'Godfather Baptism Frame',
    seoTitle: 'Godfather Picture Frame: Baptism Gift',
    seoDescription: 'A personalized godfather picture frame for a baptism or christening day. Add the godchild’s name, the date and a thank-you in your words.',
    intro: 'A thank-you for standing up on the big day.',
    goodFor: ['Baptism and christening gifts', 'From the baby or the parents', 'Godfather proposals too'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'navy-stripes',
      sides: { top: { text: 'Godfathers Are a Blessing', fontId: serif }, bottom: { text: 'Love, Your Godchild', fontId: sans } },
    },
    collections: ['godparent-frames'],
  },
  {
    handle: 'godmother-baptism-frame',
    pageKey: 'frame/godmother/baptism',
    clusterId: 'P007',
    etsyListingId: 525640447,
    name: 'Godmother Baptism Frame',
    seoTitle: 'Godmother Picture Frame: Baptism Gift',
    seoDescription: 'A personalized godmother picture frame from the baby, for a baptism or christening. Add the godchild’s name, the date and your own words.',
    intro: 'From the baby to the godmother who will always be there.',
    goodFor: ['Baptism and christening gifts', 'From the baby or the parents', 'Godmother birthdays'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'pink-toile',
      sides: { top: { text: 'Godmothers Are a Blessing', fontId: script }, bottom: { text: 'Love, Your Godchild', fontId: sans } },
    },
    collections: ['godparent-frames'],
  },
  {
    handle: 'grandpa-christmas-frame',
    pageKey: 'frame/grandpa/christmas',
    clusterId: 'P008',
    etsyListingId: 785810682,
    name: 'Grandpa Christmas Frame',
    seoTitle: 'Personalized Grandpa Christmas Picture Frame',
    seoDescription: 'A personalized Christmas picture frame for grandpa from the grandkids. Change the wording, pick a background, add a 4x6 photo.',
    intro: 'The gift under the tree he’ll keep on his desk all year.',
    goodFor: ['Christmas from the grandkids', 'A first Christmas as grandpa', 'Papa, Pop, Grandad'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'maroon-checkers',
      sides: { top: { text: 'Grandpa’s Little Girl', fontId: script }, bottom: { text: 'Christmas 2026', fontId: sans } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'grandpa-birthday-frame',
    pageKey: 'frame/grandpa/birthday',
    clusterId: 'P009',
    etsyListingId: 723490021,
    name: 'Grandpa Birthday Frame',
    seoTitle: 'Personalized Grandpa Birthday Picture Frame',
    seoDescription: 'A personalized birthday picture frame for grandpa or papa from the grandkids. Add their names and a birthday wish in your own words.',
    intro: 'Happy birthday from the people who call him Papa.',
    goodFor: ['Birthdays', 'Gifts from the grandkids', 'Father’s Day too'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'gray-shiplap',
      sides: { top: { text: 'Happy Birthday Papa', fontId: serif }, bottom: { text: 'Love, the Grandkids', fontId: script } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'engagement-frame-for-couple',
    pageKey: 'frame/couple/wedding',
    clusterId: 'P010',
    etsyListingId: 627247659,
    name: 'Engagement Frame for the Couple',
    seoTitle: 'Personalized Engagement Picture Frame for Couples',
    seoDescription: 'A personalized engagement or wedding picture frame for the couple. Add names and a date. Bridal shower and engagement gift.',
    intro: 'For the newly engaged or the just married.',
    goodFor: ['Engagement gifts', 'Bridal showers', 'Wedding gifts for the couple'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'white-shiplap',
      sides: { top: { text: 'Mr. & Mrs.', fontId: script }, bottom: { text: 'Est. 2027', fontId: serif } },
    },
    collections: ['wedding-thank-you-frames'],
  },
  {
    handle: 'aunt-uncle-picture-frame',
    pageKey: 'frame/aunt-uncle/birthday',
    clusterId: 'P012',
    etsyListingId: 227714499,
    name: 'Aunt & Uncle Picture Frame',
    seoTitle: 'Personalized Aunt and Uncle Picture Frame',
    seoDescription: 'A personalized picture frame for an aunt or uncle: birthdays, new nieces and nephews, or just because. Use the name the kids call them.',
    intro: 'For the fun aunt, the favorite uncle, or both.',
    goodFor: ['Birthdays', 'From a niece or nephew', 'New aunt and uncle announcements'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'blue-checkers',
      sides: { top: { text: 'Best Uncle Ever', fontId: serif }, bottom: { text: 'Happy Birthday', fontId: script } },
    },
    collections: ['aunt-uncle-frames'],
  },
  {
    handle: 'love-at-first-sight-ultrasound-frame',
    pageKey: 'frame/grandma/announcement',
    clusterId: 'P013',
    etsyListingId: 226797672,
    name: 'Love at First Sight Ultrasound Frame',
    seoTitle: 'Love at First Sight Ultrasound Picture Frame',
    seoDescription: 'A personalized ultrasound picture frame for a pregnancy reveal or a new grandma. Add the due date, or the baby’s name if you know it.',
    intro: 'For the first photo of the newest family member.',
    goodFor: ['Pregnancy reveals', 'Gifts for a grandma-to-be', 'Sonogram keepsakes'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'light-blue-stripes',
      sides: { top: { text: 'Love at First Sight', fontId: script }, bottom: { text: 'Baby Due 2027', fontId: sans } },
    },
    collections: ['new-grandparent-to-be', 'baby-frames', 'grandparent-frames'],
  },
  {
    handle: 'grandpa-fathers-day-frame',
    pageKey: 'frame/grandpa/fathers-day',
    clusterId: 'P014',
    etsyListingId: 805343785,
    name: 'Grandpa Father’s Day Frame',
    seoTitle: 'Personalized Grandpa Father’s Day Picture Frame',
    seoDescription: 'A personalized Father’s Day picture frame for grandpa from the grandkids. Add their names and a line in your own words.',
    intro: 'Father’s Day for the man who did it twice.',
    goodFor: ['Father’s Day', 'A first Father’s Day as grandpa', 'From the grandkids'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'olive-green-stripes',
      sides: { top: { text: 'Happy Father’s Day Grandpa', fontId: serif } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'grandpa-picture-frame',
    pageKey: 'frame/grandpa/everyday',
    clusterId: 'P015',
    etsyListingId: 532248987,
    name: 'Grandpa Picture Frame',
    seoTitle: 'Personalized Grandpa Picture Frame',
    seoDescription: 'A personalized picture frame for grandpa with the name the grandkids call him. Papa, Pop, Grandad or your own. Made to order.',
    intro: 'Papa, Pop, Grandad: put his name on it.',
    goodFor: ['Birthdays and holidays', 'Gifts from the grandkids', 'Any grandpa name'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'brown-wood-plank',
      sides: { top: { text: 'I Love My Grandpa', fontId: serif } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'gigi-christmas-frame',
    pageKey: 'frame/grandma/christmas',
    clusterId: 'P016',
    etsyListingId: 796124933,
    name: 'Gigi Christmas Frame',
    seoTitle: 'Personalized Gigi Christmas Picture Frame',
    seoDescription: 'A personalized Christmas picture frame for Gigi, Mimi or Nana from the grandkids. Use her name, sign it from the kids, add the year.',
    intro: 'A Christmas keepsake from the grandkids.',
    goodFor: ['Christmas from the grandkids', 'Any grandma name', 'A first Christmas as grandma'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'green-toile',
      sides: { top: { text: 'Merry Christmas Gigi', fontId: script }, bottom: { text: 'Love, the Grandkids', fontId: sans } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'twins-ultrasound-frame',
    pageKey: 'frame/baby/announcement',
    clusterId: 'P017',
    etsyListingId: 506697625,
    name: 'Twins Ultrasound Frame',
    seoTitle: 'Twins Ultrasound Frame: Twin Pregnancy Gift',
    seoDescription: 'A personalized twin pregnancy ultrasound frame. Add the due date or both babies’ names, and see every word before you buy.',
    intro: 'Two heartbeats, one frame.',
    goodFor: ['Twin pregnancy reveals', 'Gifts for expecting parents', 'Sonogram keepsakes'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'yellow-checkers',
      sides: { top: { text: 'Double the Love', fontId: script }, bottom: { text: 'Twins Due 2027', fontId: sans } },
    },
    collections: ['baby-frames', 'new-grandparent-to-be'],
  },
  {
    handle: 'baby-name-frame',
    pageKey: 'frame/baby/birth',
    clusterId: 'P018',
    etsyListingId: 551630150,
    name: 'Baby Name Frame',
    seoTitle: 'Personalized Baby Name Picture Frame',
    seoDescription: 'A personalized newborn picture frame with the baby’s name and birth date. Add the weight or time too. A sweet baby shower or new baby gift.',
    intro: 'For the first photo home.',
    goodFor: ['New baby gifts', 'Baby showers', 'Nursery decor'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'light-blue',
      sides: { top: { text: 'Welcome to the World', fontId: script }, bottom: { text: 'Little One', fontId: serif } },
    },
    collections: ['baby-frames'],
  },
  {
    handle: 'great-grandparent-announcement-frame',
    pageKey: 'frame/great-grandparent/announcement',
    clusterId: 'P019',
    etsyListingId: 483294076,
    name: 'Great-Grandparent Announcement Frame',
    seoTitle: 'Great Grandma Pregnancy Announcement Frame',
    seoDescription: 'Tell great-grandma or great-grandpa the news with a personalized ultrasound picture frame. Add the due date and your own words.',
    intro: 'Another generation on the way.',
    goodFor: ['Pregnancy reveals', 'Great-grandma and great-grandpa', 'Ultrasound photos'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'whitewashed-wood',
      sides: { top: { text: 'Promoted to Great Grandma', fontId: script }, bottom: { text: 'Coming 2027', fontId: sans } },
    },
    collections: ['new-grandparent-to-be', 'grandparent-frames'],
  },
  {
    handle: 'godparents-baptism-frame',
    pageKey: 'frame/godparents/baptism',
    clusterId: 'P020',
    etsyListingId: 733842083,
    name: 'Godparents Baptism Frame',
    seoTitle: 'Godparents Picture Frame: Baptism Gift',
    seoDescription: 'A personalized picture frame for both godparents, for a baptism or christening. Add their names, the godchild’s name and the date.',
    intro: 'One frame for both of them.',
    goodFor: ['Baptism and christening gifts', 'For a godparent couple', 'From the baby or the parents'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'blue-toile',
      sides: { top: { text: 'Godparents Are a Blessing', fontId: serif }, bottom: { text: 'Baptized 2026', fontId: script } },
    },
    collections: ['godparent-frames'],
  },
  {
    handle: 'pet-memorial-frame',
    pageKey: 'frame/pet/memorial',
    clusterId: 'P034',
    etsyListingId: 658788223,
    name: 'Pet Memorial Frame',
    seoTitle: 'Personalized Pet Memorial Picture Frame',
    seoDescription: 'A personalized pet memorial picture frame for a dog or cat. Add their name and years, pick a background, and frame a favorite photo.',
    intro: 'For the dog or cat who was family.',
    goodFor: ['Dog and cat memorials', 'Sympathy gifts', 'Their name and years'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'whitewashed-wood',
      sides: {
        top: { text: 'Forever in Our Hearts', fontId: script },
        left: { text: '2012', fontId: sans },
        right: { text: '2026', fontId: sans },
        bottom: { text: 'Buddy', fontId: serif },
      },
    },
    collections: ['pet-loss-memorial'],
  },
  // Exact-search pages from docs/12-serp-leadership.md §4, wave 1 (2026-11-08).
  {
    handle: 'mimi-picture-frame',
    pageKey: 'frame/grandma/everyday',
    clusterId: 'P003',
    etsyListingId: 796122233,
    name: 'Mimi Picture Frame',
    seoTitle: 'Mimi Picture Frame: Personalized Grandma Gift',
    seoDescription: 'A personalized Mimi picture frame from the grandkids. Change every word, check it in the live preview, and get free shipping in the US.',
    intro: 'For the grandma who goes by Mimi.',
    goodFor: ['Mother’s Day and birthdays', 'Gifts from the grandkids', 'A first gift from a new grandbaby', 'Christmas for Mimi'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'pink-stripes',
      sides: { top: { text: 'Mimi’s Little Loves', fontId: script }, bottom: { text: 'Ava, Noah and Mia', fontId: sans } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'nana-picture-frame',
    pageKey: 'frame/grandma/christmas',
    clusterId: 'P016',
    etsyListingId: 742353482,
    name: 'Nana Picture Frame',
    seoTitle: 'Nana Picture Frame: Personalized Grandma Gift',
    seoDescription: 'A personalized Nana picture frame with her name and the grandkids’ love. See your words in the live preview before you buy. Free shipping in the US.',
    intro: 'For the grandma everyone calls Nana.',
    goodFor: ['Mother’s Day and birthdays', 'From a grandson or granddaughter', 'A brand new Nana', 'Christmas from the grandkids'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'sage-checkers',
      sides: { top: { text: 'I Love My Nana', fontId: script } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'papa-picture-frame',
    pageKey: 'frame/grandpa/fathers-day',
    clusterId: 'P014',
    etsyListingId: 781420144,
    name: 'Papa Picture Frame',
    seoTitle: 'Papa Picture Frame: Personalized Grandpa Gift',
    seoDescription: 'A personalized Papa picture frame from the grandkids for Father’s Day, birthdays or Christmas. Live preview of your words and free shipping in the US.',
    intro: 'For the grandpa the grandkids call Papa.',
    goodFor: ['Father’s Day and birthdays', 'Gifts from the grandkids', 'A first Father’s Day as Papa', 'Christmas'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'rounded-rectangle',
      backgroundId: 'navy-stripes',
      sides: { top: { text: 'Papa’s Pride and Joy', fontId: script }, bottom: { text: 'Love, Ava and Noah', fontId: serif } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'abuela-picture-frame',
    pageKey: 'frame/grandma/everyday',
    clusterId: 'P003',
    etsyListingId: 800570881,
    name: 'Abuela Picture Frame',
    seoTitle: 'Abuela Picture Frame: Personalized Grandma Gift',
    seoDescription: 'A personalized Abuela picture frame in English, Spanish or both. See every word in the live preview before you buy. Free shipping in the US.',
    intro: 'For the abuela at the center of every family gathering.',
    goodFor: ['Mother’s Day and birthdays', 'Gifts from the grandkids', 'English, Spanish or both', 'Christmas'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'pink-toile',
      sides: { top: { text: 'Te Amo, Abuela', fontId: script } },
    },
    collections: ['grandparent-frames'],
  },
  {
    handle: 'mother-of-the-groom-frame',
    pageKey: 'frame/parents-of-couple/wedding',
    clusterId: 'P002',
    etsyListingId: 494431214,
    name: 'Mother of the Groom Picture Frame',
    seoTitle: 'Mother of the Groom Picture Frame: Wedding Gift',
    seoDescription: 'A personalized mother of the groom picture frame to thank her for raising him. Change any word in the live preview. Free shipping in the US.',
    intro: 'A thank-you for the groom’s mom on the wedding day.',
    goodFor: ['Mother of the groom', 'From the bride or the groom', 'Rehearsal dinner or wedding morning', 'Wedding thank-you gifts'],
    priceCents: FRAME_PRICE_CENTS,
    preset: {
      shape: 'scalloped',
      backgroundId: 'white-linen',
      sides: { top: { text: 'Thank You for Raising Him', fontId: script }, bottom: { text: 'Love, Sam and Alex', fontId: serif } },
    },
    collections: ['wedding-thank-you-frames'],
  },
];

/** Every page at /products/<handle>: the frame, then the designs. Checkout prices by handle. */
export const PRODUCTS: Product[] = [...FRAME_PAGES, ...DESIGN_PAGES];
export const FRAMES = FRAME_PAGES;
export const DESIGNS = DESIGN_PAGES;

/** The frame every design is sold as. */
export function frameFor(_p: Product): Product {
  return FRAME_PAGES[0]!;
}
export const isFrame = (p: Product) => p.kind === 'frame';

/**
 * Designs whose wording needs no names or dates. Since 2026-11-11 every card and
 * product page offers Add to Cart (owner's call), so the storefront no longer reads
 * this list; the product page labels its button from the example-name check instead.
 * The catalog doc and the admin's "ready as shown" box still carry it.
 */
const READY_AS_SHOWN = new Set([
  'father-of-the-bride-frame',
  'personalized-grandma-frame',
  'godmother-proposal-frame',
  'godfather-baptism-frame',
  'godmother-baptism-frame',
  'grandpa-birthday-frame',
  'aunt-uncle-picture-frame',
  'grandpa-fathers-day-frame',
  'grandpa-picture-frame',
  'gigi-christmas-frame',
  'baby-name-frame',
  'nana-picture-frame',
  'abuela-picture-frame',
]);
for (const h of READY_AS_SHOWN) if (!DESIGN_PAGES.some((p) => p.handle === h)) throw new Error(`READY_AS_SHOWN: unknown design ${h}`);
export const readyAsShown = (p: Product) => READY_AS_SHOWN.has(p.handle);

/** Design handles in the order the home page features them (most favourited first). */
export const FEATURED = DESIGN_PAGES.slice(0, 8).map((p) => p.handle);

export function productByHandle(handle: string): Product | undefined {
  return PRODUCTS.find((p) => p.handle === handle);
}

export function collectionProducts(handle: string): Product[] {
  return DESIGN_PAGES.filter((p) => p.collections.includes(handle));
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
