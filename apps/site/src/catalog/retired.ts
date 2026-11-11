// Product pages that were merged away. Old links 301 to the new page (public/_redirects)
// and a cart saved under an old handle still checks out as the new product.
// 2026-11-11: the scalloped and rounded frames became one frame; shape is a choice on it.
export const RETIRED_HANDLES: Readonly<Record<string, string>> = {
  'scalloped-picture-frame': 'personalized-picture-frame',
  'rounded-picture-frame': 'personalized-picture-frame',
};

export const currentHandle = (handle: string) => (Object.hasOwn(RETIRED_HANDLES, handle) ? RETIRED_HANDLES[handle]! : handle);
