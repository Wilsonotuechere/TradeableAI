import { supabase } from './supabase'
import type { ChatMessage } from '@shared/schema'

export interface ChatSession {
  id: string
  user_id: string
  title: string
  category: string
  created_at: string
  updated_at: string
  messages?: ChatMessage[]
}

export const chatService = {
  // Create a new chat session
  createSession: async (title: string, category: string = 'General') => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        title,
        category
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get all chat sessions for the current user
  getSessions: async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get a specific chat session with messages
  getSession: async (sessionId: string) => {
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    return {
      ...session,
      messages
    }
  },

  // Add a message to a chat session
  addMessage: async (sessionId: string, message: Omit<ChatMessage, 'id'>) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: message.role,
        content: message.content,
        intent: message.intent
      })
      .select()
      .single()

    if (error) throw error

    // Update session's updated_at timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return data
  },

  // Delete a chat session and all its messages
  deleteSession: async (sessionId: string) => {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error
  },

  // Clear all chat history for the current user
  clearAllSessions: async () => {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) throw error
  },

  // Update session title
  updateSessionTitle: async (sessionId: string, title: string) => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}