import { useState, useEffect } from 'react';

interface AnimatedMessageProps {
  content: string;
  isBot: boolean;
}

export default function AnimatedMessage({ content, isBot }: AnimatedMessageProps) {
  const [visibleWords, setVisibleWords] = useState<string[]>([]);
  const [showButton, setShowButton] = useState(false);
  
  // Check if content contains search button HTML
  const hasSearchButton = content.includes('<button') && content.includes('Search Now');
  // Check if content contains affiliate links HTML
  const hasAffiliateLink = content.includes('<a href=') && content.includes('target="_blank"');
  // Check if content contains markdown links [text](url)
  const hasMarkdownLink = content.includes('[') && content.includes('](');
  const textContent = hasSearchButton ? content.split('<div')[0] : content;
  const words = textContent.split(' ');

  useEffect(() => {
    if (!isBot) {
      setVisibleWords(words);
      if (hasSearchButton) {
        setShowButton(true);
      }
      return;
    }

    // Reset animation for new bot messages
    setVisibleWords([]);
    setShowButton(false);
    
    // Animate words appearing one by one with realistic timing
    words.forEach((word, index) => {
      setTimeout(() => {
        setVisibleWords(prev => [...prev, word]);
      }, index * 200 + Math.random() * 100); // 200ms base + random variance
    });
    
    // Show button after text animation completes
    if (hasSearchButton) {
      setTimeout(() => {
        setShowButton(true);
      }, words.length * 200 + 500);
    }
  }, [content, isBot, words.length, hasSearchButton]);

  // Function to convert markdown links to HTML
  const convertMarkdownLinks = (text: string): string => {
    const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    return text.replace(markdownLinkPattern, (match, linkText, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">${linkText}</a>`;
    });
  };

  if (!isBot) {
    return (
      <div>
        {hasAffiliateLink || hasMarkdownLink ? (
          <div dangerouslySetInnerHTML={{ __html: hasMarkdownLink ? convertMarkdownLinks(content) : content }} />
        ) : (
          <span>{textContent}</span>
        )}
        {hasSearchButton && showButton && (
          <div style={{ marginTop: '12px' }}>
            <button 
              onClick={() => (window as any).triggerChatSearch && (window as any).triggerChatSearch()}
              style={{
                background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              🔍 Search Now
            </button>
          </div>
        )}
      </div>
    );
  }

  // For bot messages with affiliate links or markdown links, render HTML directly after animation completes
  if ((hasAffiliateLink || hasMarkdownLink) && visibleWords.length === words.length) {
    return <div dangerouslySetInnerHTML={{ __html: hasMarkdownLink ? convertMarkdownLinks(content) : content }} />;
  }

  return (
    <div>
      <span>
        {visibleWords.map((word, index) => (
          <span key={index}>
            <span
              className="inline-block animate-fadeInUp"
              style={{
                animationDelay: `${index * 150}ms`,
                animationDuration: '300ms',
                animationFillMode: 'both'
              }}
            >
              {word}
            </span>
            {index < visibleWords.length - 1 && <span> </span>}
          </span>
        ))}
      </span>
      {hasSearchButton && showButton && (
        <div style={{ marginTop: '12px' }} className="animate-fadeInUp">
          <button 
            onClick={() => (window as any).triggerChatSearch && (window as any).triggerChatSearch()}
            style={{
              background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            🔍 Search Now
          </button>
        </div>
      )}
    </div>
  );
}