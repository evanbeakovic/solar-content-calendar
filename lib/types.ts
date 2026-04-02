export type Role = 'smm' | 'client' | 'manager'
export type PostStatus = 'Uploads' | 'Being Created' | 'To Be Confirmed' | 'Requested Changes' | 'Confirmed' | 'Scheduled' | 'Posted'

export interface Profile {
  id: string
  email: string
  role: Role
  client_id: string | null
  full_name: string | null
  created_at: string
  clients?: Client[]
}

export interface Client {
  id: string
  name: string
  slug: string
  brand_primary: string | null
  brand_secondary: string | null
  logo_path?: string | null
  created_at: string
}

export interface PostImage {
  id: string
  post_id: string
  path: string
  position: number
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
  change_request_note?: string | null
  change_request_images?: string[] | null
  change_request_fixed?: boolean | null
  youtube_thumbnail_path?: string | null
  client?: Client
  comments?: Comment[]
  images?: PostImage[]
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}