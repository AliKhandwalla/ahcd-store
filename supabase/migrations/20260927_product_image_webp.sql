-- ============================================================================
-- AHCD — Repoint local product images at their WebP versions
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- The five large photographs in public/images were converted from PNG to WebP,
-- cutting them from 10.9 MB to 1.35 MB with no visible change (mean error
-- around 1.2 per channel out of 255, measured against the originals). The
-- pixels, dimensions and aspect ratios are unchanged; only the container and
-- therefore the file extension differ.
--
-- product_images rows with source = 'local' store the repo path, so those
-- paths have to move with the files or the images 404.
--
-- SCOPE
-- Matches the five exact paths and nothing else. Rows with source = 'storage'
-- are untouched, as is any row an administrator has since pointed somewhere
-- else. Nothing is deleted and no row is created.
-- ============================================================================

update public.product_images
   set path = replace(path, '.png', '.webp')
 where source = 'local'
   and path in (
     '/images/ahcd-jar.png',
     '/images/ahcd-shirt.png',
     '/images/ahcd-tikka-ramen.png',
     '/images/ahcd-eggs-and-rice.png',
     '/images/ahcd-avocado-egg-toast.png'
   );

-- Verification — every local row should now point at a file that exists.
-- Expect zero rows.
--
--   select id, path from public.product_images
--    where source = 'local'
--      and path in ('/images/ahcd-jar.png', '/images/ahcd-shirt.png',
--                   '/images/ahcd-tikka-ramen.png', '/images/ahcd-eggs-and-rice.png',
--                   '/images/ahcd-avocado-egg-toast.png');
