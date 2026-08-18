-- Add images array column to public.news table
alter table public.news
  add column if not exists images text[];

-- Update existing rows to populate images array from image_url if not null
update public.news
  set images = array[image_url]
  where (images is null or array_length(images, 1) is null)
    and image_url is not null;
