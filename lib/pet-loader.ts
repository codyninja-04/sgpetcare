import { cache } from 'react'
import { getPet } from './pets'
import { createClient } from './supabase/server'

/**
 * The pet layout and each tab page both need the pet. React's cache makes the
 * second call in the same request free instead of another query and signing.
 */
export const loadPet = cache(async (id: string) => getPet(createClient(), id))
