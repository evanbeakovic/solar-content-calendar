-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('smm', 'client', 'manager')),
  client_id UUID,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from profiles to clients
ALTER TABLE public.profiles ADD CONSTRAINT profiles_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Posts table
CREATE TABLE public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_date DATE,
  platform TEXT,
  format TEXT,
  content_pillar TEXT,
  headline TEXT,
  body_text TEXT,
  cta TEXT,
  caption TEXT,
  hashtags TEXT,
  background_color TEXT,
  visual_direction TEXT,
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'To Be Confirmed' CHECK (status IN ('To Be Confirmed', 'Being Created', 'Confirmed', 'Scheduled', 'Posted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments/Change requests table
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Manager can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Manager can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Service role can manage profiles" ON public.profiles
  FOR ALL USING (true);

-- Clients policies
CREATE POLICY "SMM and manager can view all clients" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('smm', 'manager'))
  );

CREATE POLICY "Client can view own client" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND client_id = clients.id AND role = 'client')
  );

CREATE POLICY "Manager can manage clients" ON public.clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Posts policies
CREATE POLICY "SMM can view all posts" ON public.posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'smm')
  );

CREATE POLICY "SMM can manage all posts" ON public.posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'smm')
  );

CREATE POLICY "Manager can view all posts" ON public.posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Client can view own posts" ON public.posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND client_id = posts.client_id AND role = 'client')
  );

CREATE POLICY "Client can update own posts" ON public.posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND client_id = posts.client_id AND role = 'client')
  );

-- Comments policies
CREATE POLICY "Users can view comments on accessible posts" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      JOIN public.profiles pr ON pr.id = auth.uid()
      WHERE p.id = comments.post_id
      AND (pr.role IN ('smm', 'manager') OR (pr.role = 'client' AND pr.client_id = p.client_id))
    )
  );

CREATE POLICY "Users can insert comments on accessible posts" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.posts p
      JOIN public.profiles pr ON pr.id = auth.uid()
      WHERE p.id = comments.post_id
      AND (pr.role IN ('smm', 'manager') OR (pr.role = 'client' AND pr.client_id = p.client_id))
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'client'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger for posts
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for post images
-- Run this in the Supabase dashboard or via the API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

-- Storage policy for post-images bucket (run after creating bucket)
-- CREATE POLICY "Authenticated users can upload post images" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');
-- CREATE POLICY "Public read access for post images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'post-images');
-- CREATE POLICY "Authenticated users can update post images" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'post-images' AND auth.role() = 'authenticated');
