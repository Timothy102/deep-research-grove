
import * as researchService from './researchService';

/**
 * Helper function to start research with the appropriate parameters
 */
export const startResearchWithCorrectParams = async (
  id: string,
  query: string,
  options: any,
  sessionId?: string
) => {
  if (sessionId) {
    // When sessionId exists, use the id, query, and options
    return await researchService.startResearch(id, query, options);
  } else {
    // When no sessionId, create a new session with the query and options
    return await researchService.startResearch(id, query, options);
  }
};
