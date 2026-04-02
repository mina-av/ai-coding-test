'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type UserRolle = 'kalkulator' | 'teamleiter'

interface UserInfo {
  email: string
  rolle: UserRolle
  loading: boolean
}

export function useUser(): UserInfo {
  const [email, setEmail] = useState('')
  const [rolle, setRolle] = useState<UserRolle>('kalkulator')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        // Rolle aus app_metadata (nur via Service Role Key setzbar, nicht vom User überschreibbar)
        const appMeta = data.user.app_metadata as { rolle?: string } | undefined
        setRolle(appMeta?.rolle === 'teamleiter' ? 'teamleiter' : 'kalkulator')
      }
      setLoading(false)
    })
  }, [])

  return { email, rolle, loading }
}
