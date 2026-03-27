export type Role = 'smm' | 'client' | 'manager'

export type PostStatus = 'To Be Confirmed' | 'Being Created' | 'Confirmed' | 'Scheduled' | 'Posted'

export interface Profile {
  id: string
  email: string
  role: Role
  client_id: string | null
  full_name: string | null
  created_at: string
}

export interface Client {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Post {
  id: string
  client_id: string
  scheduled_date: string | null
  platform: string | null
  format: string | null
  content_pillar: string | null
  headline: string | null
  body_text: string | null
  cta: string | null
  caption: string | null
  hashtags: string | null
  background_color: string | null
  visual_direction: string | null
  image_path: string | null
  status: PostStatus
  created_at: string
  updated_at: string
  client?: Client
  comments?: Comment[]
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}
