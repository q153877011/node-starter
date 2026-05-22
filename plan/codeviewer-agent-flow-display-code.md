# 首页右侧 CodeViewer 展示代码草案

这份代码用于首页右侧 `CodeViewer` 展示，目标是**简洁表达 EdgeOne 上创建 Node Agent 的关键流程**，不要求直接运行。重点展示：

- `context.store`：保存用户/助手消息，支持历史恢复；
- `ChatSession`：基于 EdgeOne Store 读取历史并转换成 OpenAI-compatible messages；
- `context.tools`：获取 EdgeOne 沙箱工具；
- `buildTools()`：把 EdgeOne tools 转换成 OpenAI-compatible function calling schema；
- `fetch(.../chat/completions)`：调用 OpenAI-compatible LLM；
- tool calling：模型返回 `tool_calls` 后调用 EdgeOne 沙箱工具。

```ts
import { getModelConfig } from '../_model';
import { ChatSession } from '../_session';
import { buildTools } from '../_tools';

const SYSTEM_PROMPT = `...`;

export async function onRequest(context: any) {
  const message = context.request.body?.message ?? '';
  const conversationId = context.conversation_id;

  // 1. EdgeOne Store：读取历史 + 保存用户消息
  const session = new ChatSession(context.store);
  const history = await session.getHistory(conversationId);
  await session.saveUserMessage(conversationId, message);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];

  // 2. EdgeOne Tools：读取平台沙箱工具并转换成 function calling tools
  const toolRegistry = buildTools(context);

  const modelConfig = getModelConfig(context.env);
  const payload: Record<string, unknown> = {
    model: modelConfig.model,
    messages,
    stream: true,
  };

  if (toolRegistry.hasTools()) {
    payload.tools = toolRegistry.tools;
    payload.tool_choice = 'auto';
  }

  // 3. 调用 OpenAI-compatible LLM
  const response = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${modelConfig.apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: context.request.signal,
  });

  // 4. 处理模型返回：文本 or 工具调用
  const assistantMessage = await readAssistantMessage(response);

  if (assistantMessage.tool_calls?.length) {
    for (const toolCall of assistantMessage.tool_calls) {
      const name = toolCall.function.name;
      const args = toolCall.function.arguments;

      // 调用 EdgeOne 沙箱工具，例如 commands / files / browser / code_interpreter
      const toolResult = await toolRegistry.execute(name, args);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }

    // 继续把工具结果发回模型，直到得到最终回答
    assistantMessage.content = await continueLlmWithToolResults(messages);
  }

  // 5. EdgeOne Store：保存助手回复，供 /history 恢复
  await session.saveAssistantMessage(conversationId, assistantMessage.content);

  return Response.json({ answer: assistantMessage.content });
}

async function readAssistantMessage(response: Response) {
  // 伪代码：解析模型响应，省略流式 text_delta / tool_called 细节
  return { content: '...', tool_calls: [] as any[] };
}

async function continueLlmWithToolResults(messages: unknown[]) {
  // 伪代码：继续请求模型，省略细节
  return '...';
}
```

## 建议在 CodeViewer 中突出展示的流程

1. `context.store`：读写用户/助手消息；
2. `ChatSession(context.store)`：把 EdgeOne Store 封装成会话历史接口；
3. `session.getHistory()`：读取历史并转成 OpenAI-compatible messages；
4. `buildTools(context)`：从 `context.tools` 构建 OpenAI function calling tools；
5. `toolRegistry.execute(name, args)`：调用 EdgeOne 沙箱工具；
6. `fetch(.../chat/completions)`：启动模型调用；
7. `session.saveAssistantMessage()`：保存助手回复，支持历史恢复。
