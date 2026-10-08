/* eslint-disable @next/next/no-img-element */
import { speciesEmoji, type Species } from '@/lib/types'

const SIZES = {
  xs: 'h-6 w-6 text-[13px] rounded-md',
  sm: 'h-9 w-9 text-lg rounded-xl',
  md: 'h-14 w-14 text-2xl rounded-2xl',
  lg: 'h-24 w-24 text-5xl rounded-[28px] sm:h-28 sm:w-28',
}

/**
 * Signed photo when there is one, otherwise the species emoji on a warm tile.
 * Signed URLs are short lived, so plain img is used rather than next/image,
 * which would cache the URL past its expiry.
 */
export function PetAvatar({
  photo,
  species,
  name,
  size = 'md',
}: {
  photo: string | null
  species: Species | null
  name: string
  size?: keyof typeof SIZES
}) {
  const cls = `${SIZES[size]} shrink-0 overflow-hidden`
  if (photo) return <img src={photo} alt={name} className={`${cls} object-cover ring-1 ring-border`} />
  return (
    <span className={`${cls} grid place-items-center bg-gradient-to-br from-primary-soft to-subtle ring-1 ring-primary/10`} aria-hidden>
      {speciesEmoji(species)}
    </span>
  )
}
