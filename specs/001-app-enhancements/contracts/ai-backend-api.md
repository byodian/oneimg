# AI Backend API Contracts

**Version**: 1.0  
**Base URL**: `https://api.oneimg.app` (or deployed Cloudflare Worker URL)  
**Protocol**: HTTPS REST  
**Authentication**: None for free tier, Payment token for paid requests, API key header for user keys

## Endpoints

1. **POST /ai/suggest** - Generate AI-powered suggestions (headline, hashtag, grammar, template recommendations)
2. **POST /ai/generate-template** - Generate custom visual template based on content analysis
3. **POST /ai/estimate-cost** - Get cost estimate before paid request
4. **GET /ai/providers** - List available AI providers with status and rate limits
5. **POST /payment/create-checkout** - Create Stripe/Alipay checkout for paid requests
6. **GET /payment/verify** - Verify payment completion

---

### 1. POST /ai/suggest

Generate AI-powered suggestions for content optimization.

**Request**:
```json
{
  "type": "headline" | "hashtag" | "grammar" | "template",
  "text": "string (original content)",
  "context": {
    "platform": "instagram" | "twitter" | "wechat" | "xiaohongshu" | "linkedin" | null,
    "tone": "professional" | "casual" | "enthusiastic" | "formal" | null,
    "targetLength": "short" | "medium" | "long" | null
  },
  "provider": "free" | "gpt-4" | "claude-opus" | "llama-3.1" | "mistral-7b",
  "apiKey": "string (optional, user's own API key)"
}
```

**Response (Success - 200)**:
```json
{
  "suggestions": ["string", "string", "string"],
  "provider": "groq" | "hf" | "openai" | "anthropic",
  "model": "llama-3.1-8b" | "mistral-7b" | "gpt-4" | "claude-opus-20240229",
  "confidenceScore": 0.85,
  "costUSD": 0.03,
  "metadata": {
    "processingTimeMs": 1234,
    "tokenCount": 150
  }
}
```

**Response (Rate Limited - 429)**:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Free tier: 10 requests per hour. Next available: 2026-01-29T15:30:00Z",
  "retryAfter": 1234,
  "upgradeOptions": {
    "payPerRequest": {
      "costUSD": 0.03,
      "checkoutUrl": "https://checkout.stripe.com/..."
    },
    "bringOwnKey": true
  }
}
```

**Response (Payment Required - 402)**:
```json
{
  "error": "payment_required",
  "message": "Premium model requires payment",
  "cost": {
    "apiCostUSD": 0.03,
    "serviceFeeUSD": 0.003,
    "totalUSD": 0.033
  },
  "checkoutUrl": "https://checkout.stripe.com/...",
  "expiresAt": "2026-01-29T15:45:00Z"
}
```

**Response (Error - 500)**:
```json
{
  "error": "provider_error",
  "message": "AI provider unavailable. Trying fallback...",
  "fallbackProvider": "hf",
  "retryable": true
}
```

---

### 2. POST /ai/generate-template

Generate custom template based on content analysis. Returns CSS variables, layout rules, and color scheme.

**Request**:
```json
{
  "contentAnalysis": {
    "contentLength": 1200,
    "contentType": "article" | "quote" | "technical" | "marketing" | "social",
    "tone": "professional" | "casual" | "playful" | "serious" | "inspirational",
    "hasImages": true,
    "dominantColors": ["#3B82F6", "#EF4444"],  // Optional, extracted from images
    "keywords": ["design", "web", "modern"]      // Optional, for context
  },
  "userPreferences": {
    "colorScheme": "light" | "dark" | "auto",
    "style": "minimalist" | "bold" | "elegant" | "tech" | "cartoon",  // Optional suggestion
    "accessibility": "high" | "medium"  // High = WCAG AAA, Medium = WCAG AA
  },
  "provider": "gpt-4" | "claude-opus" | "llama-3.1",
  "paymentMethod": "free" | "stripe" | "alipay" | "user-api-key",
  "modificationPrompt": "string"  // Optional, for regeneration (e.g., "make it more colorful")
}
```

**Response (200)**:
```json
{
  "template": {
    "name": "Modern Article - Blue Accent",
    "description": "Professional article template with blue accent colors",
    "category": "minimalist",
    "cssVariables": {
      "--primary-color": "#3B82F6",
      "--background-color": "#FFFFFF",
      "--text-color": "#1F2937",
      "--heading-font": "Inter, sans-serif",
      "--body-font": "Georgia, serif",
      "--card-padding": "40px",
      "--border-radius": "12px"
    },
    "layoutRules": {
      "cardPadding": "40px",
      "cardMargin": "0 auto",
      "borderRadius": "12px",
      "maxWidth": "800px",
      "headerHeight": "auto"
    },
    "metadata": {
      "platform": ["wechat", "linkedin"],
      "colorScheme": "light",
      "accessibility": {
        "contrastRatio": 7.2,
        "fontSize": "16px"
      },
      "tags": ["professional", "modern", "article"]
    }
  },
  "aiMetadata": {
    "modelUsed": "gpt-4",
    "prompt": "Generate professional template for 1200-char article with blue accent...",
    "generationCost": 0.045,
    "reasoning": "Selected minimalist style with blue accent to match content type..."
  },
  "previewDataURL": "data:image/png;base64,..."  // 400x300 preview thumbnail
}
```

**Response (402 Payment Required)** - if paid model selected without payment:
```json
{
  "error": "payment_required",
  "message": "This AI model requires payment",
  "costEstimate": {
    "apiCostUSD": 0.04,
    "serviceFeeUSD": 0.004,
    "totalUSD": 0.044
  },
  "paymentOptions": ["stripe", "alipay"]
}
```

---

### 3. POST /ai/estimate-cost

Get cost estimate before making paid request.

**Request**:
```json
{
  "type": "headline" | "hashtag" | "grammar" | "template",
  "text": "string",
  "contentAnalysis": object,  // For template generation estimates
  "provider": "gpt-4" | "claude-opus"
}
```

**Response (200)**:
```json
{
  "estimatedCost": {
    "apiCostUSD": 0.03,
    "serviceFeeUSD": 0.003,
    "totalUSD": 0.033
  },
  "estimatedTokens": 150,
  "breakdown": {
    "inputTokens": 100,
    "outputTokens": 50,
    "pricePerInputToken": 0.00015,
    "pricePerOutputToken": 0.0006
  }
}
```

---

### 4. GET /ai/providers

List available AI providers and their status.

**Response (200)**:
```json
{
  "providers": [
    {
      "id": "groq-llama",
      "name": "Llama 3.1 (8B)",
      "type": "free",
      "status": "available",
      "avgResponseTimeMs": 800,
      "rateLimit": {
        "requestsPerHour": 10,
        "remainingRequests": 7,
        "resetAt": "2026-01-29T16:00:00Z"
      }
    },
    {
      "id": "hf-mistral",
      "name": "Mistral 7B",
      "type": "free",
      "status": "available",
      "avgResponseTimeMs": 1200,
      "rateLimit": {
        "requestsPerHour": 10,
        "remainingRequests": 10,
        "resetAt": "2026-01-29T16:00:00Z"
      }
    },
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "type": "paid",
      "status": "available",
      "avgResponseTimeMs": 2000,
      "costPerRequest": 0.03
    },
    {
      "id": "claude-opus",
      "name": "Claude Opus",
      "type": "paid",
      "status": "available",
      "avgResponseTimeMs": 1500,
      "costPerRequest": 0.035
    }
  ]
}
```

---

### 4. POST /payment/create-checkout

Create payment checkout session for pay-per-request (Stripe or Alipay).

**Request**:
```json
{
  "provider": "gpt-4" | "claude-opus",
  "estimatedCost": 0.033,
  "paymentMethod": "stripe" | "alipay",
  "currency": "USD" | "CNY",
  "successUrl": "https://oneimg.app/editor?payment=success",
  "cancelUrl": "https://oneimg.app/editor?payment=cancel"
}
```

**Response (200 - Stripe)**:
```json
{
  "paymentMethod": "stripe",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_...",
  "expiresAt": "2026-01-29T15:45:00Z"
}
```

**Response (200 - Alipay)**:
```json
{
  "paymentMethod": "alipay",
  "checkoutUrl": "https://openapi.alipay.com/gateway.do?...",
  "tradeNo": "20260129...",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2026-01-29T15:45:00Z"
}
```

---

### 5. GET /payment/verify

Verify payment completion and get request token (supports both Stripe and Alipay).

**Query Parameters**:
- `sessionId`: string (Stripe checkout session ID, optional)
- `tradeNo`: string (Alipay trade number, optional)

**Response (200)**:
```json
{
  "status": "paid",
  "paymentMethod": "stripe" | "alipay",
  "requestToken": "tok_...",
  "expiresAt": "2026-01-29T16:00:00Z",
  "provider": "gpt-4",
  "amountPaidUSD": 0.033,
  "currency": "USD" | "CNY",
  "originalAmount": 0.033
}
```

**Response (Payment Pending - 202)**:
```json
{
  "status": "pending",
  "message": "Payment processing, check again in a few seconds"
}
```

---

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Missing or invalid parameters |
| 401 | `invalid_api_key` | User-provided API key is invalid |
| 402 | `payment_required` | Premium model requires payment |
| 429 | `rate_limit_exceeded` | Free tier rate limit hit |
| 500 | `provider_error` | AI provider unavailable |
| 503 | `service_unavailable` | Backend temporarily down |

---

## Rate Limiting

### Free Tier
- **Limit**: 10 requests per hour per IP address
- **Window**: Rolling 1-hour window
- **Headers**:
  ```
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1706540400
  ```

### Paid Tier
- No rate limits (per-request billing)

### User API Keys
- Rate limits determined by provider (OpenAI, Anthropic, etc.)

---

## Security

### CORS
- **Allowed Origins**: `https://oneimg.app`, `http://localhost:3000` (dev)
- **Allowed Methods**: GET, POST, OPTIONS
- **Allowed Headers**: Content-Type, Authorization

### Content Security
- All prompts sanitized (remove script tags, dangerous HTML)
- User-provided API keys never logged or stored
- Payment tokens expire after 15 minutes

### DDoS Protection
- Cloudflare rate limiting: 100 req/min per IP
- Request size limit: 10KB
- Timeout: 30 seconds

---

## Example Request Flow

### Free Model Request
```bash
curl -X POST https://api.oneimg.app/ai/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "headline",
    "text": "My blog post about AI",
    "provider": "free"
  }'
```

### Paid Model Request
```bash
# Step 1: Get cost estimate
curl -X POST https://api.oneimg.app/ai/estimate-cost \
  -H "Content-Type: application/json" \
  -d '{
    "type": "headline",
    "text": "My blog post about AI",
    "provider": "gpt-4"
  }'

# Step 2: Create checkout (Stripe for international users)
curl -X POST https://api.oneimg.app/payment/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gpt-4",
    "estimatedCost": 0.033,
    "paymentMethod": "stripe",
    "currency": "USD",
    "successUrl": "https://oneimg.app/editor?payment=success",
    "cancelUrl": "https://oneimg.app/editor?payment=cancel"
  }'

# Step 2 (Alternative): Create checkout with Alipay for Chinese users
curl -X POST https://api.oneimg.app/payment/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gpt-4",
    "estimatedCost": 0.23,
    "paymentMethod": "alipay",
    "currency": "CNY",
    "successUrl": "https://oneimg.app/editor?payment=success",
    "cancelUrl": "https://oneimg.app/editor?payment=cancel"
  }'

# Step 3: User completes payment in checkout page or scans QR code (Alipay)

# Step 4: Verify payment (Stripe)
curl -X GET "https://api.oneimg.app/payment/verify?sessionId=cs_test_..."

# Step 4 (Alternative): Verify payment (Alipay)
curl -X GET "https://api.oneimg.app/payment/verify?tradeNo=20260129..."

# Step 5: Make AI request with token
curl -X POST https://api.oneimg.app/ai/suggest \
  -H "Content-Type: application/json" \
  -H "X-Request-Token: tok_..." \
  -d '{
    "type": "headline",
    "text": "My blog post about AI",
    "provider": "gpt-4"
  }'
```

### User API Key Request
```bash
curl -X POST https://api.oneimg.app/ai/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "headline",
    "text": "My blog post about AI",
    "provider": "gpt-4",
    "apiKey": "sk-..."
  }'
```

#### Example 5: AI Template Generation (Free Model)

```bash
curl -X POST https://api.oneimg.app/ai/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "contentAnalysis": {
      "contentLength": 800,
      "contentType": "article",
      "tone": "professional",
      "hasImages": true,
      "dominantColors": ["#3B82F6"]
    },
    "userPreferences": {
      "colorScheme": "light",
      "accessibility": "high"
    },
    "provider": "llama-3.1",
    "paymentMethod": "free"
  }'
```

#### Example 6: AI Template Regeneration (Paid Model)

```bash
curl -X POST https://api.oneimg.app/ai/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "contentAnalysis": {
      "contentLength": 800,
      "contentType": "article",
      "tone": "professional",
      "hasImages": true
    },
    "userPreferences": {
      "colorScheme": "light",
      "style": "minimalist"
    },
    "provider": "gpt-4",
    "paymentMethod": "stripe",
    "modificationPrompt": "Make it more colorful with warmer tones"
  }'
# Returns 402 with cost estimate and checkout URL
```

---

## TypeScript Types

```typescript
// Request types
export interface AISuggestRequest {
  type: 'headline' | 'hashtag' | 'grammar' | 'template';
  text: string;
  context?: {
    platform?: 'instagram' | 'twitter' | 'wechat' | 'xiaohongshu' | 'linkedin';
    tone?: 'professional' | 'casual' | 'enthusiastic' | 'formal';
    targetLength?: 'short' | 'medium' | 'long';
  };
  provider: 'free' | 'gpt-4' | 'claude-opus' | 'llama-3.1' | 'mistral-7b';
  apiKey?: string;
}

export interface AIGenerateTemplateRequest {
  contentAnalysis: {
    contentLength: number;
    contentType: 'article' | 'quote' | 'technical' | 'marketing' | 'social';
    tone: 'professional' | 'casual' | 'playful' | 'serious' | 'inspirational';
    hasImages: boolean;
    dominantColors?: string[];
    keywords?: string[];
  };
  userPreferences: {
    colorScheme: 'light' | 'dark' | 'auto';
    style?: 'minimalist' | 'bold' | 'elegant' | 'tech' | 'cartoon';
    accessibility: 'high' | 'medium';
  };
  provider: 'gpt-4' | 'claude-opus' | 'llama-3.1';
  paymentMethod: 'free' | 'stripe' | 'alipay' | 'user-api-key';
  modificationPrompt?: string;
}

export interface CostEstimateRequest {
  type: 'headline' | 'hashtag' | 'grammar' | 'template';
  text?: string;
  contentAnalysis?: object;
  provider: 'gpt-4' | 'claude-opus';
}

export interface CreateCheckoutRequest {
  provider: 'gpt-4' | 'claude-opus';
  estimatedCost: number;
  paymentMethod: 'stripe' | 'alipay';
  currency: 'USD' | 'CNY';
  successUrl: string;
  cancelUrl: string;
}

// Response types
export interface AISuggestResponse {
  suggestions: string[];
  provider: 'groq' | 'hf' | 'openai' | 'anthropic';
  model: string;
  confidenceScore: number;
  costUSD: number;
  rateLimitInfo?: {
    remainingRequests: number;
    resetAt: string;
  };
  fallbackProvider?: string;
  retryable: boolean;
}

export interface AIGenerateTemplateResponse {
  template: {
    name: string;
    description: string;
    category: string;
    cssVariables: Record<string, string>;
    layoutRules: {
      cardPadding: string;
      cardMargin: string;
      borderRadius: string;
      maxWidth: string;
      headerHeight: string;
    };
    metadata: {
      platform: string[];
      colorScheme: 'light' | 'dark' | 'auto';
      accessibility: {
        contrastRatio: number;
        fontSize: string;
      };
      tags: string[];
    };
  };
  aiMetadata: {
    modelUsed: string;
    prompt: string;
    generationCost: number;
    reasoning: string;
  };
  previewDataURL: string;
}
  metadata: {
    processingTimeMs: number;
    tokenCount: number;
  };
}

export interface RateLimitError {
  error: 'rate_limit_exceeded';
  message: string;
  retryAfter: number;
  upgradeOptions: {
    payPerRequest: {
      costUSD: number;
      checkoutUrl: string;
    };
    bringOwnKey: boolean;
  };
}

export interface PaymentRequiredError {
  error: 'payment_required';
  message: string;
  cost: {
    apiCostUSD: number;
    serviceFeeUSD: number;
    totalUSD: number;
  };
  checkoutUrl: string;
  expiresAt: string;
}

export interface ProviderError {
  error: 'provider_error';
  message: string;
  fallbackProvider?: string;
  retryable: boolean;
}

export interface CostEstimateResponse {
  estimatedCost: {
    apiCostUSD: number;
    serviceFeeUSD: number;
    totalUSD: number;
  };
  estimatedTokens: number;
  breakdown: {
    inputTokens: number;
    outputTokens: number;
    pricePerInputToken: number;
    pricePerOutputToken: number;
  };
}

export interface ProviderInfo {
  id: string;
  name: string;
  type: 'free' | 'paid';
  status: 'available' | 'unavailable' | 'degraded';
  avgResponseTimeMs: number;
  rateLimit?: {
    requestsPerHour: number;
    remainingRequests: number;
    resetAt: string;
  };
  costPerRequest?: number;
}

export interface ProvidersResponse {
  providers: ProviderInfo[];
}

export interface CheckoutResponse {
  paymentMethod: 'stripe' | 'alipay';
  checkoutUrl: string;
  sessionId?: string;
  tradeNo?: string;
  qrCode?: string;
  expiresAt: string;
}

export interface PaymentVerifyResponse {
  status: 'paid' | 'pending' | 'failed';
  paymentMethod?: 'stripe' | 'alipay';
  requestToken?: string;
  expiresAt?: string;
  provider?: string;
  amountPaidUSD?: number;
  currency?: 'USD' | 'CNY';
  originalAmount?: number;
  message?: string;
}
```
