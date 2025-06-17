import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react'
import './App.css'

// User persona data
const USER_PERSONA = {
  lifeStory: "I'm someone who thrives on building intelligent systems that solve real-world problems. My journey began with a deep curiosity about how things work — from cricket match analyzers to fraud detection systems, I've always pushed myself to understand both the data and the human behind it. I value clarity, impact, and constant learning, and I try to infuse those into every project I touch.",
  superpower: "Turning complexity into clarity — whether it's distilling a dense technical problem or architecting an end-to-end system, I have a knack for breaking things down, understanding them deeply, and explaining them simply.",
  growthAreas: [
    "System design at scale — especially for AI products with large user bases.",
    "Leadership and team mentorship — helping others grow while building aligned, high-performing teams.",
    "Product thinking — going beyond code to understand user behavior, business impact, and long-term value."
  ],
  misconception: "Sometimes people assume I'm very serious or overly analytical, but I actually enjoy creative problem-solving, light humor, and brainstorming unconventional ideas — especially when building something new.",
  pushingBoundaries: "I try to regularly step out of my comfort zone — whether that means taking on a project I've never done before, speaking up in situations where I'd usually stay quiet, or learning something completely new. I've realized growth doesn't happen when things feel easy, so I lean into challenges even if they feel a bit uncomfortable at first. It's not always smooth, but I've found that's when I learn the most."
};

function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('openai_api_key'));
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setShowApiKeyInput(false);
    }
  };

  const generatePersonalizedResponse = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('life story') || lowerQuestion.includes('about you') || lowerQuestion.includes('background')) {
      return USER_PERSONA.lifeStory;
    }
    
    if (lowerQuestion.includes('superpower') || lowerQuestion.includes('strength') || lowerQuestion.includes('best at')) {
      return USER_PERSONA.superpower;
    }
    
    if (lowerQuestion.includes('grow') || lowerQuestion.includes('improve') || lowerQuestion.includes('development') || lowerQuestion.includes('areas')) {
      return `The top 3 areas I'd like to grow in are: ${USER_PERSONA.growthAreas.join(' ')}`;
    }
    
    if (lowerQuestion.includes('misconception') || lowerQuestion.includes('assume') || lowerQuestion.includes('coworkers') || lowerQuestion.includes('colleagues')) {
      return USER_PERSONA.misconception;
    }
    
    if (lowerQuestion.includes('boundaries') || lowerQuestion.includes('limits') || lowerQuestion.includes('challenge') || lowerQuestion.includes('push')) {
      return USER_PERSONA.pushingBoundaries;
    }
    
    // Default response for other questions
    return `That's an interesting question! Let me think about that in the context of my experience building intelligent systems and solving real-world problems. ${USER_PERSONA.lifeStory.split('.')[0]}.`;
  };

  const callOpenAI = async (userMessage) => {
    if (!apiKey) {
      throw new Error('Please provide your OpenAI API key');
    }

    // First, try to generate a personalized response
    const personalizedResponse = generatePersonalizedResponse(userMessage);
    
    const systemPrompt = `You are responding as someone with this background and personality:

Life Story: ${USER_PERSONA.lifeStory}

#1 Superpower: ${USER_PERSONA.superpower}

Top 3 Growth Areas: ${USER_PERSONA.growthAreas.join(' ')}

Misconception: ${USER_PERSONA.misconception}

Pushing Boundaries: ${USER_PERSONA.pushingBoundaries}

Respond naturally and conversationally as this person would, incorporating relevant details from their background. Keep responses concise but personal. If the question directly relates to one of the specific topics above, use that information prominently in your response.

Here's a suggested response based on the person's background: "${personalizedResponse}"

You can use this as inspiration but feel free to expand or modify it to sound more natural and conversational.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get response from OpenAI');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await callOpenAI(userMessage);
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      // Speak the response
      if (synthRef.current && !isSpeaking) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        synthRef.current.speak(utterance);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  if (showApiKeyInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Voice Bot</CardTitle>
            <CardDescription>
              Please enter your OpenAI API key to get started. Your key will be stored locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="min-h-[100px]"
            />
            <Button onClick={saveApiKey} className="w-full" disabled={!apiKey.trim()}>
              Save API Key
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an API key? Get one from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                OpenAI Platform
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Voice Bot</h1>
          <p className="text-gray-600">Ask me about my background, experience, and goals!</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowApiKeyInput(true)}
            className="mt-2"
          >
            Change API Key
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Sample Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-2 text-left"
                onClick={() => setInputText("What should we know about your life story in a few sentences?")}
              >
                What should we know about your life story?
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-2 text-left"
                onClick={() => setInputText("What's your #1 superpower?")}
              >
                What's your #1 superpower?
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-2 text-left"
                onClick={() => setInputText("What are the top 3 areas you'd like to grow in?")}
              >
                What are your top 3 growth areas?
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-2 text-left"
                onClick={() => setInputText("What misconception do your coworkers have about you?")}
              >
                What misconception do coworkers have about you?
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <Card key={index} className={`${message.role === 'user' ? 'ml-12 bg-blue-50' : 'mr-12 bg-white'}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    message.role === 'user' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {message.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <p className="flex-1 text-gray-700">{message.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-2">
              <Textarea
                placeholder="Ask me anything about my background, experience, or goals..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                className="flex-1 min-h-[60px]"
                disabled={isLoading}
              />
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={isListening ? stopListening : startListening}
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={isSpeaking ? stopSpeaking : handleSendMessage}
                  disabled={isLoading || (!inputText.trim() && !isSpeaking)}
                  size="icon"
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {isListening && (
              <p className="text-sm text-blue-600 mt-2 animate-pulse">Listening...</p>
            )}
            {isLoading && (
              <p className="text-sm text-gray-500 mt-2">Thinking...</p>
            )}
            {isSpeaking && (
              <p className="text-sm text-green-600 mt-2 animate-pulse">Speaking...</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This voice bot uses your OpenAI API key to respond as you would to personal questions.</p>
          <p>Click the microphone to speak, or type your question and click send.</p>
        </div>
      </div>
    </div>
  );
}

export default App;

