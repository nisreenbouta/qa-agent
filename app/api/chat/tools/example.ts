
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => {
    // Your implementation
    console.log("calling tool")
    return { temperature: 72, conditions: 'sunny' };
  },
});

export { weatherTool };