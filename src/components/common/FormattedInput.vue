<template>
  <el-input v-model="displayValue" :placeholder="placeholder" :size="size" :class="inputClass" @input="handleInput"
    @focus="handleFocus" @blur="handleBlur" v-bind="$attrs">
    <template #suffix>
      <span v-if="inputSuffix" class="input-suffix">{{ inputSuffix }}</span>
      <slot/>
    </template>
  </el-input>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatNumber, formatLargeNumber } from '@/utils/format'
import BigNumber from 'bignumber.js'

interface Props {
  modelValue: string | number
  placeholder?: string
  size?: 'large' | 'default' | 'small'
  inputClass?: string
  decimals?: number
  useAbbreviation?: boolean // 是否使用K、M、B、T缩写
  abbreviationThreshold?: number // 启用缩写的阈值
  maxDecimals?: number // 最大小数位数
  inputSuffix?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  size: 'default',
  inputClass: '',
  decimals: 6,
  useAbbreviation: true,
  abbreviationThreshold: 1000000,
  maxDecimals: 6,
  inputSuffix: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'inputChange': [value: string]
}>()

const displayValue = ref('')
const rawValue = ref('')
const isFocused = ref(false)

// 解析缩写单位的数值
const parseAbbreviatedValue = (value: string): string => {
  const cleanValue = value.trim().toLowerCase()
  const numericMatch = cleanValue.match(/^([0-9]*\.?[0-9]+)/)

  if (!numericMatch) return '0'

  const numericPart = new BigNumber(numericMatch[1])

  if (cleanValue.includes('t')) {
    return numericPart.multipliedBy(new BigNumber('1e12')).toString()
  } else if (cleanValue.includes('b')) {
    return numericPart.multipliedBy(new BigNumber('1e9')).toString()
  } else if (cleanValue.includes('m')) {
    return numericPart.multipliedBy(new BigNumber('1e6')).toString()
  } else if (cleanValue.includes('k')) {
    return numericPart.multipliedBy(new BigNumber('1e3')).toString()
  }

  return value;
}

// 格式化显示值
const formatDisplayValue = (value: string): string => {
  if (!value || value === '0') return ''

  try {
    const numValue = new BigNumber(value)
    if (numValue.isNaN() || numValue.isZero()) return ''

    if (props.useAbbreviation && numValue.isGreaterThanOrEqualTo(props.abbreviationThreshold)) {
      return formatLargeNumber(numValue.toNumber(), 2)
    }

    return formatNumber(numValue.toNumber(), props.decimals)
  } catch (error) {
    return ''
  }
}

// 处理输入
const handleInput = (value: string) => {
  // 允许输入数字、小数点和单位字母
  const cleanValue = value.replace(/[^0-9.kmbtKMBT]/g, '')

  // 确保只有一个小数点
  const parts = cleanValue.split('.')
  let processedValue = parts[0]
  if (parts.length > 1) {
    processedValue += '.' + parts.slice(1).join('')
  }

  // 限制小数位数
  const decimalIndex = processedValue.indexOf('.')
  if (decimalIndex !== -1 && processedValue.length - decimalIndex - 1 > props.maxDecimals) {
    processedValue = processedValue.substring(0, decimalIndex + props.maxDecimals + 1)
  }

  displayValue.value = processedValue

  // 解析实际数值
  const actualValue = parseAbbreviatedValue(processedValue)
  rawValue.value = actualValue
  emit('update:modelValue', rawValue.value)
  emit('inputChange', rawValue.value)
}

// 处理聚焦
const handleFocus = () => {
  isFocused.value = true
  // 聚焦时显示原始数值，便于编辑
  if (rawValue.value) {
    try {
      const numValue = new BigNumber(rawValue.value)

      if (!numValue.isNaN() && numValue.isGreaterThan(0)) {
        displayValue.value = numValue.toFixed()
      } else if (numValue.isEqualTo(0)) {
        displayValue.value = ''
      }
    } catch (error) {
      // 忽略错误，保持当前显示值
    }
  }
}

// 处理失焦
const handleBlur = () => {
  isFocused.value = false
  // 失焦时显示格式化数值
  if (rawValue.value) {
    try {
      const numValue = new BigNumber(rawValue.value)
      if (!numValue.isNaN() && numValue.isGreaterThanOrEqualTo(0)) {
        displayValue.value = formatDisplayValue(rawValue.value)
      }
    } catch (error) {
      // 忽略错误，保持当前显示值
    }
  }
}

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    const valueStr = typeof newValue === 'number' ? newValue.toString() : newValue
    rawValue.value = valueStr
    if (!isFocused.value) {
      // 未聚焦时显示格式化值
      displayValue.value = formatDisplayValue(valueStr)
    }
  },
  { immediate: true }
)

// 暴露方法供父组件调用
defineExpose({
  focus: () => {
    // 这里可以添加聚焦逻辑
  },
  blur: () => {
    handleBlur()
  },
  clear: () => {
    displayValue.value = ''
    rawValue.value = ''
    emit('update:modelValue', '')
  }
})
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>