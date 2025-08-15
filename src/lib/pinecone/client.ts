import { Pinecone } from '@pinecone-database/pinecone'

let pineconeClient: Pinecone | null = null

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required')
    }

    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    })
  }

  return pineconeClient
}

export async function getIndex(indexName?: string) {
  const client = getPineconeClient()
  const name = indexName || process.env.PINECONE_INDEX_NAME || 'facet-memory'
  
  try {
    return client.index(name)
  } catch (error) {
    console.error('Error getting Pinecone index:', error)
    throw new Error(`Failed to get Pinecone index: ${name}`)
  }
}

export async function createIndexIfNotExists(
  indexName: string = 'facet-memory',
  dimension: number = 1536
): Promise<void> {
  const client = getPineconeClient()
  
  try {
    // Check if index exists
    const indexList = await client.listIndexes()
    const existingIndex = indexList.indexes?.find(index => index.name === indexName)
    
    if (!existingIndex) {
      console.log(`Creating Pinecone index: ${indexName}`)
      
      await client.createIndex({
        name: indexName,
        dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      })
      
      // Wait for index to be ready
      console.log('Waiting for index to be ready...')
      let isReady = false
      while (!isReady) {
        try {
          const indexStatus = await client.describeIndex(indexName)
          isReady = indexStatus.status?.ready === true
          if (!isReady) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.error('Error checking index status:', error)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      console.log(`Index ${indexName} created and ready`)
    } else {
      console.log(`Index ${indexName} already exists`)
    }
  } catch (error) {
    console.error('Error creating Pinecone index:', error)
    throw error
  }
}