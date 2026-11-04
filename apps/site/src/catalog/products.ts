// The store's catalog: one configurable frame (two shapes, 44 backgrounds, text on
// any side), sold through search-intent pages that each preset it. Every page here
// is a row with build: true in plans/decisions.json (PROPOSED, gate G2). Prices are
// Etsy parity, from each page's preset listing in plans/clusters.json.
//
// This file is plain TypeScript with no Astro imports, so the checkout Worker reads
// the same prices and handles the pages render.
import type { FrameSpec } from '@butterlu/frame';

export interface Product {
  /** URL slug: /products/<handle>. Old Shopify handles 301 here (public/_redirects). */
  handle: string;
  /** plans/clusters.json pageKey and clusterId this page builds. */
  pageKey: string;
  clusterId: string;
  /** Etsy listing whose wording and look seeded the preset. */
  etsyListingId: number;
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
export const SHOP = {
  name: 'Butterlu',
  /** Shown on product pages and the shipping page. PROPOSED, the owner confirms. */
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
    name: 'Grandparent frames',
    seoTitle: 'Personalized Grandparent Picture Frames',
    seoDescription: 'Personalized picture frames for grandma and grandpa: birthdays, Christmas, Father’s Day and pregnancy reveals. Your words, 44 backgrounds.',
    intro: 'Frames for Mimi, Gigi, Papa and every name in between. Pick a design, change the words, and add your favorite 4x6 photo when it arrives.',
  },
  {
    handle: 'new-grandparent-to-be',
    name: 'Pregnancy announcement frames',
    seoTitle: 'Pregnancy Announcement Frames for Grandparents',
    seoDescription: 'Ultrasound picture frames to tell grandparents, great-grandparents and family the news. Personalized wording, ships ready for your sonogram.',
    intro: 'The frame for the moment you tell them. Slip in the ultrasound photo and let the words do the reveal.',
  },
  {
    handle: 'godparent-frames',
    name: 'Godparent frames',
    seoTitle: 'Godparent Frames for Baptisms and Proposals',
    seoDescription: 'Godmother and godfather picture frames for baptisms, christenings and asking the question. Personalized wording on 44 backgrounds.',
    intro: 'Ask them to be godparents, or thank them on the day. Each frame is made to order with your wording.',
  },
  {
    handle: 'wedding-thank-you-frames',
    name: 'Wedding frames',
    seoTitle: 'Personalized Wedding Picture Frames',
    seoDescription: 'Wedding picture frames for the parents of the bride and groom, and engagement frames for the couple. Personalized, made to order.',
    intro: 'Thank-you frames for the parents and keepsakes for the couple, with words that sound like you.',
  },
  {
    handle: 'aunt-uncle-frames',
    name: 'Aunt and uncle frames',
    seoTitle: 'Personalized Aunt and Uncle Picture Frames',
    seoDescription: 'Personalized picture frames for aunts and uncles: birthdays, new nieces and nephews, and just because. Your words on 44 backgrounds.',
    intro: 'For the aunt and uncle who show up for everything. Change the words to their names, nicknames or an inside joke.',
  },
  {
    handle: 'baby-frames',
    name: 'Baby frames',
    seoTitle: 'Personalized Baby and Ultrasound Picture Frames',
    seoDescription: 'Baby name frames, twin ultrasound frames and newborn keepsakes. Personalized wording, both frame shapes, 44 backgrounds.',
    intro: 'From the first sonogram to the first photo home. Every frame is made to order with your wording.',
  },
  {
    handle: 'pet-loss-memorial',
    name: 'Pet memorial frames',
    seoTitle: 'Personalized Pet Memorial Picture Frames',
    seoDescription: 'Pet memorial picture frames for a dog or cat you miss. Add their name and years, choose a background, and frame a favorite photo.',
    intro: 'A gentle place for a favorite photo of the dog or cat who was family. Add their name and their years.',
  },
];

export const PRODUCTS: Product[] = [
  {
    handle: 'grandparent-pregnancy-announcement-frame',
    pageKey: 'frame/grandparents-to-be/announcement',
    clusterId: 'P001',
    etsyListingId: 693902312,
    name: 'Grandparent pregnancy announcement frame',
    seoTitle: 'Grandparent Pregnancy Announcement Frame',
    seoDescription: 'Tell them they’re going to be grandparents. A personalized ultrasound picture frame with your wording, in two shapes and 44 backgrounds.',
    intro: 'The reveal that ends in happy tears. Put the ultrasound photo in the frame, wrap it, and watch them read it.',
    goodFor: ['Telling your parents the news', 'First grandchild reveals', 'Ultrasound or sonogram photos'],
    priceCents: 3795,
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
    name: 'Father of the bride wedding frame',
    seoTitle: 'Father of the Bride Wedding Picture Frame',
    seoDescription: 'A personalized wedding picture frame for dad, mom or the parents of the couple. Your words, both frame shapes, 44 backgrounds.',
    intro: 'A thank-you for the people who got you here. Change the words for mom, the groom’s parents or both sets of parents.',
    goodFor: ['Father or mother of the bride', 'Parents of the groom', 'Wedding thank-you gifts'],
    priceCents: 3595,
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
    name: 'Personalized grandma frame',
    seoTitle: 'Personalized Grandma Frame: Mimi, Gigi, Nana',
    seoDescription: 'A personalized picture frame for grandma with the name the grandkids call her. Mimi, Gigi, Nana or your own. Made to order.',
    intro: 'Mimi, Gigi, Nana, Grammy: put her name on it. A frame for the photo of her favorite people.',
    goodFor: ['Mother’s Day and birthdays', 'Gifts from the grandkids', 'Any grandma name'],
    priceCents: 3595,
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
    name: 'Godmother proposal frame',
    seoTitle: 'Will You Be My Godmother Proposal Frame',
    seoDescription: 'Ask her to be godmother with a personalized picture frame. Add a photo of the baby and your own wording. Two shapes, 44 backgrounds.',
    intro: 'The sweetest way to ask. Add a photo of the baby and let the frame pop the question.',
    goodFor: ['Asking a godmother', 'Baptism and christening plans', 'A keepsake she’ll keep'],
    priceCents: 3795,
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
    name: 'Godfather baptism frame',
    seoTitle: 'Godfather Picture Frame: Baptism Gift',
    seoDescription: 'A personalized godfather picture frame for a baptism or christening day. Your wording on two frame shapes and 44 backgrounds.',
    intro: 'A thank-you for standing up on the big day. A photo from the baptism looks perfect in it.',
    goodFor: ['Baptism and christening gifts', 'From the baby or the parents', 'Godfather proposals too'],
    priceCents: 3595,
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
    name: 'Godmother baptism frame',
    seoTitle: 'Godmother Picture Frame: Baptism Gift',
    seoDescription: 'A personalized godmother picture frame from the baby, for a baptism or christening. Your wording, two shapes, 44 backgrounds.',
    intro: 'From the baby to the godmother who will always be there. Frame a photo from the day.',
    goodFor: ['Baptism and christening gifts', 'From the baby or the parents', 'Godmother birthdays'],
    priceCents: 3595,
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
    name: 'Grandpa Christmas frame',
    seoTitle: 'Personalized Grandpa Christmas Picture Frame',
    seoDescription: 'A personalized Christmas picture frame for grandpa from the grandkids. Change the wording, pick a background, add a 4x6 photo.',
    intro: 'The gift under the tree he’ll keep on his desk all year. Change “little girl” to “little buddy” or anything you like.',
    goodFor: ['Christmas from the grandkids', 'A first Christmas as grandpa', 'Papa, Pop, Grandad'],
    priceCents: 3595,
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
    name: 'Grandpa birthday frame',
    seoTitle: 'Personalized Grandpa Birthday Picture Frame',
    seoDescription: 'A personalized birthday picture frame for grandpa or papa from the grandkids. Your words, two shapes, 44 backgrounds.',
    intro: 'Happy birthday from the people who call him Papa. Add the grandkids’ names or a favorite saying.',
    goodFor: ['Birthdays', 'Gifts from the grandkids', 'Father’s Day too'],
    priceCents: 3595,
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
    name: 'Engagement frame for the couple',
    seoTitle: 'Personalized Engagement Picture Frame for Couples',
    seoDescription: 'A personalized engagement or wedding picture frame for the couple. Add names and a date. Bridal shower and engagement gift.',
    intro: 'For the newly engaged or the just married. Add their names, their date or their new last name.',
    goodFor: ['Engagement gifts', 'Bridal showers', 'Wedding gifts for the couple'],
    priceCents: 3795,
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
    name: 'Aunt and uncle picture frame',
    seoTitle: 'Personalized Aunt and Uncle Picture Frame',
    seoDescription: 'A personalized picture frame for an aunt or uncle: birthdays, new nieces and nephews, or just because. Two shapes, 44 backgrounds.',
    intro: 'For the fun aunt, the favorite uncle, or both. Change the wording to their names or a nickname only the kids use.',
    goodFor: ['Birthdays', 'From a niece or nephew', 'New aunt and uncle announcements'],
    priceCents: 3595,
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
    name: 'Love at first sight ultrasound frame',
    seoTitle: 'Love at First Sight Ultrasound Picture Frame',
    seoDescription: 'A personalized ultrasound picture frame for a pregnancy reveal or a new grandma. Add the due date. Two shapes, 44 backgrounds.',
    intro: 'For the first photo of the newest family member. Add the due date, or a name if you know it.',
    goodFor: ['Pregnancy reveals', 'Gifts for a grandma-to-be', 'Sonogram keepsakes'],
    priceCents: 3795,
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
    name: 'Grandpa Father’s Day frame',
    seoTitle: 'Personalized Grandpa Father’s Day Picture Frame',
    seoDescription: 'A personalized Father’s Day picture frame for grandpa from the grandkids. Your wording on two frame shapes and 44 backgrounds.',
    intro: 'Father’s Day for the man who did it twice. Add the grandkids’ names along the sides.',
    goodFor: ['Father’s Day', 'A first Father’s Day as grandpa', 'From the grandkids'],
    priceCents: 3595,
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
    name: 'Grandpa picture frame',
    seoTitle: 'Personalized Grandpa Picture Frame',
    seoDescription: 'A personalized picture frame for grandpa with the name the grandkids call him. Papa, Pop, Grandad or your own. Made to order.',
    intro: 'Papa, Pop, Grandad: put his name on it. A frame for a photo with the grandkids.',
    goodFor: ['Birthdays and holidays', 'Gifts from the grandkids', 'Any grandpa name'],
    priceCents: 3595,
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
    name: 'Gigi Christmas frame',
    seoTitle: 'Personalized Gigi Christmas Picture Frame',
    seoDescription: 'A personalized Christmas picture frame for Gigi, Mimi or Nana from the grandkids. Your wording, two shapes, 44 backgrounds.',
    intro: 'A Christmas keepsake from the grandkids. Change Gigi to whatever they call her.',
    goodFor: ['Christmas from the grandkids', 'Any grandma name', 'A first Christmas as grandma'],
    priceCents: 3595,
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
    name: 'Twins ultrasound frame',
    seoTitle: 'Twins Ultrasound Frame: Twin Pregnancy Gift',
    seoDescription: 'A personalized twin pregnancy ultrasound frame. Add the due date or the babies’ names. Two frame shapes, 44 backgrounds.',
    intro: 'Two heartbeats, one frame. Add the due date or both names.',
    goodFor: ['Twin pregnancy reveals', 'Gifts for expecting parents', 'Sonogram keepsakes'],
    priceCents: 3795,
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
    name: 'Baby name frame',
    seoTitle: 'Personalized Baby Name Picture Frame',
    seoDescription: 'A personalized newborn picture frame with the baby’s name and birth date. Baby shower and new baby gift. Two shapes, 44 backgrounds.',
    intro: 'For the first photo home. Add the baby’s name, birth date or weight along any side.',
    goodFor: ['New baby gifts', 'Baby showers', 'Nursery decor'],
    priceCents: 3795,
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
    name: 'Great-grandparent announcement frame',
    seoTitle: 'Great Grandma Pregnancy Announcement Frame',
    seoDescription: 'Tell great-grandma or great-grandpa the news with a personalized ultrasound picture frame. Your wording, two shapes, 44 backgrounds.',
    intro: 'Another generation on the way. Change it to great-grandpa, or both of them.',
    goodFor: ['Pregnancy reveals', 'Great-grandma and great-grandpa', 'Ultrasound photos'],
    priceCents: 3795,
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
    name: 'Godparents baptism frame',
    seoTitle: 'Godparents Picture Frame: Baptism Gift',
    seoDescription: 'A personalized picture frame for both godparents, for a baptism or christening. Your wording, two shapes, 44 backgrounds.',
    intro: 'One frame for both of them. Add their names and the baptism date.',
    goodFor: ['Baptism and christening gifts', 'For a godparent couple', 'From the baby or the parents'],
    priceCents: 3595,
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
    name: 'Pet memorial frame',
    seoTitle: 'Personalized Pet Memorial Picture Frame',
    seoDescription: 'A personalized pet memorial picture frame for a dog or cat. Add their name and years, pick a background, and frame a favorite photo.',
    intro: 'For the dog or cat who was family. Put their name on top and their years on the sides.',
    goodFor: ['Dog and cat memorials', 'Sympathy gifts', 'Their name and years'],
    priceCents: 3595,
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
];

/** Product handles in the order the home page features them (most favourited first). */
export const FEATURED = PRODUCTS.slice(0, 8).map((p) => p.handle);

export function productByHandle(handle: string): Product | undefined {
  return PRODUCTS.find((p) => p.handle === handle);
}

export function collectionProducts(handle: string): Product[] {
  return PRODUCTS.filter((p) => p.collections.includes(handle));
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
