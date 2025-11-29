import {
  Button,
  Container,
  Text,
  VerticalSpace,
  render
} from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h, JSX } from 'preact'
import { useState, useCallback, useRef } from 'preact/hooks'
import '!./output.css'

function Plugin() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(async (event: JSX.TargetedEvent<HTMLInputElement>) => {
    setIsLoading(true)
    setMessage(null)
    try {
      const files = event.currentTarget.files
      const file = files ? files[0] : null
      if (!file) {
        setIsLoading(false)
        return
      }

      const text = await file.text()
      const json = JSON.parse(text)

      emit('CREATE_TOKENS', json)
      setMessage({ type: 'success', text: 'Tokens sent to Figma!' })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Failed to parse JSON file.' })
    } finally {
      setIsLoading(false)
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text className="text-xl font-bold mb-4">Import Design Tokens</Text>
      <VerticalSpace space="small" />
      <div className="flex flex-col items-center justify-center gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }}
        />
        <Button fullWidth loading={isLoading} onClick={handleButtonClick}>
          Select Token JSON File
        </Button>
        {message && (
          <Text
            className={`text-sm ${
              message.type === 'error' ? 'text-red-500' : 'text-green-600'
            }`}
          >
            {message.text}
          </Text>
        )}
        <Text className="text-xs text-gray-500 text-center">
          Select a JSON file containing your design tokens (colors, typography, etc.)
        </Text>
      </div>
      <VerticalSpace space="large" />
    </Container>
  )
}

export default render(Plugin)
