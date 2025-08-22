import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set up Supabase connection."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
  conversation_id: string;
  metadata?: Record<string, any>;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  user_id: string | null;
  last_message?: string;
  category?: string;
};

// Chat helper functions
export const chat = {
  async createConversation(title: string): Promise<string> {
    const { data, error } = await supabase
      .from("conversations")
      .insert([{ title }])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  },

  async saveMessage(
    message: Omit<ChatMessage, "id" | "created_at">
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from("messages")
      .insert([message])
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async getConversation(
    id: string
  ): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
    const [conversationResult, messagesResult] = await Promise.all([
      supabase.from("conversations").select("*").eq("id", id).single(),
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (conversationResult.error) throw conversationResult.error;
    if (messagesResult.error) throw messagesResult.error;

    return {
      conversation: conversationResult.data,
      messages: messagesResult.data,
    };
  },

  async getConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateConversationTitle(id: string, title: string): Promise<void> {
    const { error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", id);

    if (error) throw error;
  },
};

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },

  getUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },
};
