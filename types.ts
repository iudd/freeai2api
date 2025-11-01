// freeai2api 类型定义

export interface FreeAIResponse {
  id: number;
  user_id: number;
  task_id: string;
  task_type: string;
  status: 'processing' | 'completed' | 'failed';
  params: {
    width: number;
    height: number;
    prompt: string;
    batch_size: number;
    negative_prompt?: string;
  };
  data: string[] | null;
  data1: string | null;
  data2: string | null;
  priority: number;
  created_at: string;
}

export interface FreeAICreateResponse {
  success: boolean;
  task_id: string;
}

export interface CreateImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  batch_size?: number;
  negative_prompt?: string;
}

export interface ImageGenerationResult {
  task_id: string;
  prompt: string;
  status: string;
  images: string[];
  parameters: {
    width: number;
    height: number;
    batch_size: number;
    negative_prompt?: string;
  };
  created_at: string;
  completed_at?: string;
  response_time_ms?: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface StandardAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: string;
}

export interface GenerateImagesRequest {
  prompt: string;
  width?: number;
  height?: number;
  batch_size?: number;
  negative_prompt?: string;
  style?: string;
}

export interface GenerateImagesResponse {
  task_id: string;
  status: 'processing' | 'completed' | 'failed';
  prompt: string;
  images?: string[];
  estimated_time_seconds?: number;
}