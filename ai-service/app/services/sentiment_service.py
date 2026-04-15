import logging

class SentimentService:
    def __init__(self):
        self.cache = {}
    
    def analyze(self, text):
        """
        Simple sentiment analysis
        """
        bullish_words = ['bullish', 'buy', 'upgrade', 'growth', 'profit', 'earnings', 'beat', 'surge', 'gain']
        bearish_words = ['bearish', 'sell', 'downgrade', 'loss', 'miss', 'decline', 'drop', 'fear', 'risk']
        
        text_lower = text.lower()
        
        bullish_count = sum(1 for word in bullish_words if word in text_lower)
        bearish_count = sum(1 for word in bearish_words if word in text_lower)
        
        if bullish_count > bearish_count:
            return {'label': 'Bullish', 'confidence': 0.7 + (bullish_count * 0.05)}
        elif bearish_count > bullish_count:
            return {'label': 'Bearish', 'confidence': 0.7 + (bearish_count * 0.05)}
        else:
            return {'label': 'Neutral', 'confidence': 0.6}
    
    def analyze_batch(self, articles):
        """
        Analyze batch of articles
        """
        results = []
        for article in articles:
            title = article.get('title', '')
            result = self.analyze(title)
            results.append(result)
        return results