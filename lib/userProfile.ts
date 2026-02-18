import { supabase } from './supabaseClient'

export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Erro ao buscar perfil:', error)
    return null
  }
  return data
}

export async function isAdmin() {
  const profile = await getUserProfile()
  return profile?.nivel_acesso === 'admin'
}