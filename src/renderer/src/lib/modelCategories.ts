import { ModelType } from '@shared/model'
import type { RENDERER_MODEL_META } from '@shared/presenter'

/**
 * 模型分类枚举
 */
export enum ModelCategory {
  All = 'all',
  Chat = 'chat',
  Reasoning = 'reasoning',
  Vision = 'vision',
  Network = 'network',
  Free = 'free',
  Rerank = 'rerank',
  Tool = 'tool',
  Embedding = 'embedding',
  ImageGeneration = 'imageGeneration'
}

/**
 * 根据模型属性判断模型所属分类
 * @param model 模型元数据
 * @returns 模型所属的分类数组
 */
export function getModelCategories(model: RENDERER_MODEL_META): ModelCategory[] {
  const categories: ModelCategory[] = [ModelCategory.All]

  // 根据模型类型分类
  if (model.type === ModelType.Chat) {
    categories.push(ModelCategory.Chat)
  } else if (model.type === ModelType.Embedding) {
    categories.push(ModelCategory.Embedding)
  } else if (model.type === ModelType.Rerank) {
    categories.push(ModelCategory.Rerank)
  } else if (model.type === ModelType.ImageGeneration) {
    categories.push(ModelCategory.ImageGeneration)
  } else if (model.type === ModelType.Tool) {
    categories.push(ModelCategory.Tool)
  } else if (model.type === ModelType.Network) {
    categories.push(ModelCategory.Network)
  } else {
    // 默认情况下，没有明确类型的模型归类为对话模型
    categories.push(ModelCategory.Chat)
  }

  // 根据特殊能力分类
  if (model.reasoning) {
    categories.push(ModelCategory.Reasoning)
  }

  if (model.vision) {
    categories.push(ModelCategory.Vision)
  }

  if (model.network) {
    categories.push(ModelCategory.Network)
  }

  if (model.functionCall) {
    categories.push(ModelCategory.Tool)
  }

  // 根据价格分类
  if (model.isFree || isModelFree(model)) {
    categories.push(ModelCategory.Free)
  }

  return categories
}

/**
 * 判断模型是否免费
 * @param model 模型元数据
 * @returns 是否免费
 */
function isModelFree(model: RENDERER_MODEL_META): boolean {
  // 如果明确标记为免费
  if (model.isFree) {
    return true
  }

  // 如果没有价格信息，且是某些已知的免费模型
  if (!model.pricing) {
    const freeModelPatterns = [
      /^ollama:/,
      /^local:/,
      /gemma/i,
      /^huggingface:/,
      /^phi-/i,
      /^llama.*3\.2.*1b/i,
      /^llama.*3\.2.*3b/i,
      /^qwen.*0\.5b/i,
      /^qwen.*1\.5b/i
    ]

    return freeModelPatterns.some(pattern => pattern.test(model.id) || pattern.test(model.name))
  }

  // 如果有价格信息，检查是否为0
  if (model.pricing) {
    return (model.pricing.input === 0 && model.pricing.output === 0)
  }

  return false
}

/**
 * 根据分类过滤模型列表
 * @param models 模型列表
 * @param category 要过滤的分类
 * @returns 过滤后的模型列表
 */
export function filterModelsByCategory(
  models: RENDERER_MODEL_META[], 
  category: ModelCategory
): RENDERER_MODEL_META[] {
  if (category === ModelCategory.All) {
    return models
  }

  return models.filter(model => {
    const modelCategories = getModelCategories(model)
    return modelCategories.includes(category)
  })
}

/**
 * 获取模型的主要分类（用于显示）
 * @param model 模型元数据
 * @returns 主要分类
 */
export function getModelPrimaryCategory(model: RENDERER_MODEL_META): ModelCategory {
  // 优先级：特殊类型 > 能力 > 默认对话
  if (model.type === ModelType.Embedding) return ModelCategory.Embedding
  if (model.type === ModelType.Rerank) return ModelCategory.Rerank
  if (model.type === ModelType.ImageGeneration) return ModelCategory.ImageGeneration
  if (model.type === ModelType.Tool) return ModelCategory.Tool
  if (model.type === ModelType.Network) return ModelCategory.Network

  // 如果是对话模型，根据能力细分
  if (model.reasoning) return ModelCategory.Reasoning
  if (model.vision) return ModelCategory.Vision

  return ModelCategory.Chat
}

/**
 * 获取分类的统计信息
 * @param models 模型列表
 * @returns 各分类的模型数量统计
 */
export function getCategoryStats(models: RENDERER_MODEL_META[]): Record<ModelCategory, number> {
  const stats: Record<ModelCategory, number> = {
    [ModelCategory.All]: models.length,
    [ModelCategory.Chat]: 0,
    [ModelCategory.Reasoning]: 0,
    [ModelCategory.Vision]: 0,
    [ModelCategory.Network]: 0,
    [ModelCategory.Free]: 0,
    [ModelCategory.Rerank]: 0,
    [ModelCategory.Tool]: 0,
    [ModelCategory.Embedding]: 0,
    [ModelCategory.ImageGeneration]: 0
  }

  models.forEach(model => {
    const categories = getModelCategories(model)
    categories.forEach(category => {
      if (category !== ModelCategory.All) {
        stats[category]++
      }
    })
  })

  return stats
}