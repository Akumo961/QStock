import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  Code,
  ExpandMore,
  ExpandLess,
  Inventory2,
} from '@mui/icons-material';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  sql?: string;
  rows?: Record<string, unknown>[];
  error?: string;
  timestamp: Date;
}

interface ChatResponse {
  answer: string;
  sql?: string;
  rows?: Record<string, unknown>[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Suggested prompts shown when the conversation is empty (English / French)
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS: Record<'en' | 'fr', string[]> = {
  en: [
    'How many items do we currently have in stock?',
    'Which items are currently borrowed?',
    'Show all electronics in the inventory.',
    'Which items have been borrowed the most?',
    'What items are in maintenance?',
    'Show inventory added this month.',
  ],
  fr: [
    'Combien d\u2019articles avons-nous actuellement en stock ?',
    'Quels articles sont actuellement empruntés ?',
    'Affiche tous les articles électroniques de l\u2019inventaire.',
    'Quels articles ont été le plus emprunté ?',
    'Quels articles sont en maintenance ?',
    'Affiche l\u2019inventaire ajouté ce mois-ci.',
  ],
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Expandable SQL panel shown below an assistant message */
const SqlPanel: React.FC<{ sql: string; rows?: Record<string, unknown>[]; fr: boolean }> = ({ sql, rows, fr }) => {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ mt: 1 }}>
      <Tooltip title={open ? (fr ? 'Masquer les détails de la requête' : 'Hide query details') : (fr ? 'Afficher les détails de la requête' : 'Show query details')}>
        <Chip
          icon={<Code sx={{ fontSize: 14 }} />}
          label={open ? (fr ? 'Masquer le SQL' : 'Hide SQL') : (fr ? 'Afficher le SQL' : 'Show SQL')}
          size="small"
          variant="outlined"
          onClick={() => setOpen(v => !v)}
          deleteIcon={open ? <ExpandLess /> : <ExpandMore />}
          onDelete={() => setOpen(v => !v)}
          sx={{ fontSize: '0.7rem', cursor: 'pointer', color: '#2d6a4f', borderColor: '#2d6a4f' }}
        />
      </Tooltip>

      <Collapse in={open}>
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            bgcolor: '#1b1b2f',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: '#a8ff78',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {sql}
        </Box>

        {rows && rows.length > 0 && (
          <Box sx={{ mt: 1, overflowX: 'auto' }}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
              {fr ? `${rows.length} ligne(s) retournée(s)` : `${rows.length} row(s) returned`}
            </Typography>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.73rem',
                '& th, & td': {
                  border: '1px solid #e0e0e0',
                  px: 1,
                  py: 0.5,
                  textAlign: 'left',
                  verticalAlign: 'top',
                },
                '& th': { bgcolor: '#f0f4f0', fontWeight: 600 },
                '& tr:hover td': { bgcolor: '#f9fdf9' },
              }}
            >
              <thead>
                <tr>
                  {Object.keys(rows[0]).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val === null ? <em style={{ color: '#aaa' }}>null</em> : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Box>
            {rows.length > 20 && (
              <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 0.5 }}>
                {fr ? `Affichage des 20 premières lignes sur ${rows.length}.` : `Showing first 20 of ${rows.length} rows.`}
              </Typography>
            )}
          </Box>
        )}
      </Collapse>
    </Box>
  );
};

/** Single chat bubble */
const MessageBubble: React.FC<{ message: Message; fr: boolean }> = ({ message, fr }) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
        mb: 2,
      }}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: isUser ? '#2d6a4f' : '#52b788',
        }}
      >
        {isUser ? (
          <Person sx={{ fontSize: 20, color: 'white' }} />
        ) : (
          <SmartToy sx={{ fontSize: 20, color: 'white' }} />
        )}
      </Box>

      {/* Bubble */}
      <Box sx={{ maxWidth: '75%' }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: isUser ? '#2d6a4f' : '#ffffff',
            color: isUser ? 'white' : 'inherit',
            border: isUser ? 'none' : '1px solid #e8f5e9',
            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {message.text}
          </Typography>
        </Paper>

        {/* SQL panel — only for assistant messages that have SQL */}
        {!isUser && message.sql && (
          <SqlPanel sql={message.sql} rows={message.rows} fr={fr} />
        )}

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            color: '#aaa',
            textAlign: isUser ? 'right' : 'left',
            fontSize: '0.65rem',
          }}
        >
          {message.timestamp.toLocaleTimeString(fr ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AIAssistant: React.FC = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  let nextId = useRef(1);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Add user message
    const userMsg: Message = {
      id: nextId.current++,
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // AI chat can take 60–120 s on local hardware (CPU/GPU-split inference).
      // The global axios instance has a 60 s timeout — override it here for
      // just this call. The Vite proxy also has a 300 s proxyTimeout set in
      // vite.config.ts, which is what actually keeps the tunnel open long
      // enough for the model to respond. Both must be generous.
      const data = await api.post<ChatResponse>(
        '/ai/chat',
        { message: trimmed, language },
        undefined,
        { timeout: 300000 },   // 5 minutes — matches the vite proxy timeout
      );

      const assistantMsg: Message = {
        id: nextId.current++,
        role: 'assistant',
        text: data.answer,
        sql: data.sql ?? undefined,
        rows: data.rows ?? undefined,
        error: data.error ?? undefined,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const isTimeout =
        (err as any)?.message?.includes('timeout') ||
        (err as any)?.code === 'ECONNABORTED';
      const errorMsg: Message = {
        id: nextId.current++,
        role: 'assistant',
        text: isTimeout
          ? (fr
              ? "La requête a pris trop de temps. Le modèle est peut-être en cours de chargement — réessayez dans quelques secondes."
              : 'The request timed out. The model may still be loading — please try again.')
          : (fr
              ? `Une erreur s'est produite : ${(err as any)?.message ?? 'inconnue'}. Veuillez réessayer.`
              : `Something went wrong: ${(err as any)?.message ?? 'unknown error'}. Please try again.`),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      // Re-focus input for quick follow-up questions
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 72px)',   // account for Header height
        bgcolor: '#f4f7f6',
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: 'white',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: '#2d6a4f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SmartToy sx={{ color: 'white', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1b4332', lineHeight: 1.2 }}>
            {fr ? "Assistant IA d'inventaire" : 'AI Inventory Assistant'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#666' }}>
            {fr ? 'Posez n\u2019importe quelle question sur votre inventaire' : 'Ask anything about your inventory in plain English'}
          </Typography>
        </Box>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Messages area                                                       */}
      {/* ------------------------------------------------------------------ */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        {messages.length === 0 ? (
          /* Welcome / empty state */
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Inventory2 sx={{ fontSize: 56, color: '#c8e6c9', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#555', mb: 1 }}>
              {fr ? 'Que voulez-vous savoir sur votre inventaire ?' : 'What would you like to know about your inventory?'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#999', mb: 4 }}>
              {fr ? 'Essayez une des suggestions ci-dessous ou tapez votre propre question.' : 'Try one of the suggestions below or type your own question.'}
            </Typography>

            {/* Suggested prompt chips */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 640, mx: 'auto' }}>
              {SUGGESTED_PROMPTS[fr ? 'fr' : 'en'].map(prompt => (
                <Chip
                  key={prompt}
                  label={prompt}
                  variant="outlined"
                  clickable
                  onClick={() => sendMessage(prompt)}
                  sx={{
                    borderColor: '#52b788',
                    color: '#2d6a4f',
                    '&:hover': { bgcolor: '#e8f5e9' },
                    fontSize: '0.8rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} fr={fr} />
            ))}

            {/* Loading indicator */}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: '#52b788',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SmartToy sx={{ fontSize: 20, color: 'white' }} />
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.5,
                    border: '1px solid #e8f5e9',
                    borderRadius: '4px 18px 18px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CircularProgress size={14} sx={{ color: '#2d6a4f' }} />
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    {fr ? 'Réflexion en cours…' : 'Thinking…'}
                  </Typography>
                </Paper>
              </Box>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* ------------------------------------------------------------------ */}
      {/* Input area                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          py: 2,
          bgcolor: 'white',
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          placeholder={fr ? 'Posez une question sur votre inventaire…' : 'Ask a question about your inventory…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              '&.Mui-focused fieldset': { borderColor: '#2d6a4f' },
            },
          }}
        />
        <IconButton
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          sx={{
            bgcolor: '#2d6a4f',
            color: 'white',
            borderRadius: 2,
            p: 1.2,
            '&:hover': { bgcolor: '#1b4332' },
            '&.Mui-disabled': { bgcolor: '#ccc', color: 'white' },
          }}
        >
          <Send sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <Typography
        variant="caption"
        sx={{ textAlign: 'center', color: '#bbb', pb: 1, fontSize: '0.65rem' }}
      >
        {fr
          ? "Les réponses de l'IA sont basées sur vos données d'inventaire en direct. Accès en lecture seule uniquement."
          : 'AI responses are based on your live inventory data. Read-only access only.'}
      </Typography>
    </Box>
  );
};

export default AIAssistant;