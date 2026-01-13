/**
 * Canvas API Client
 * Handles authentication, pagination, and HTTP requests
 */

import type { ApiError, PaginationLinks } from "./types.ts";

export interface ClientOptions {
  baseUrl: string;
  apiToken: string;
  /** Items per page for paginated requests (default: 100) */
  perPage?: number;
}

export class CanvasClient {
  private baseUrl: string;
  private apiToken: string;
  private perPage: number;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiToken = options.apiToken;
    this.perPage = options.perPage || 100;
  }

  /**
   * Build the full URL for an API endpoint
   */
  private buildUrl(path: string, params?: Record<string, string | string[] | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);

    // Add per_page by default for list endpoints
    url.searchParams.set("per_page", String(this.perPage));

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
          // Handle array params like include[]=foo&include[]=bar
          for (const v of value) {
            url.searchParams.append(`${key}[]`, v);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Parse Link header for pagination
   */
  private parseLinkHeader(linkHeader: string | null): PaginationLinks {
    if (!linkHeader) return {};

    const links: PaginationLinks = {};
    const parts = linkHeader.split(",");

    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const [, url, rel] = match;
        links[rel as keyof PaginationLinks] = url;
      }
    }

    return links;
  }

  /**
   * Make an authenticated request to the Canvas API
   */
  async fetch<T>(
    path: string,
    options?: {
      method?: string;
      params?: Record<string, string | string[] | number | boolean | undefined>;
      body?: unknown;
    }
  ): Promise<{ data: T; links: PaginationLinks }> {
    const { method = "GET", params, body } = options || {};
    const url = this.buildUrl(path, params);

    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiToken}`,
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorMessage = `Canvas API error: ${response.status} ${response.statusText}`;

      try {
        const errorData: ApiError = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors?.length) {
          errorMessage = errorData.errors.map((e) => e.message).join(", ");
        }
      } catch {
        // Couldn't parse error body, use default message
      }

      throw new Error(errorMessage);
    }

    const data = await response.json() as T;
    const links = this.parseLinkHeader(response.headers.get("Link"));

    return { data, links };
  }

  /**
   * Fetch all pages of a paginated endpoint
   */
  async fetchAll<T>(
    path: string,
    options?: {
      params?: Record<string, string | string[] | number | boolean | undefined>;
      /** Maximum number of items to fetch (default: unlimited) */
      limit?: number;
    }
  ): Promise<T[]> {
    const { params, limit } = options || {};
    const results: T[] = [];

    let url: string | undefined = this.buildUrl(path, params);

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = `Canvas API error: ${response.status} ${response.statusText}`;

        try {
          const errorData: ApiError = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Couldn't parse error body
        }

        throw new Error(errorMessage);
      }

      const data = await response.json() as T[];
      results.push(...data);

      // Check if we've hit the limit
      if (limit && results.length >= limit) {
        return results.slice(0, limit);
      }

      // Get next page URL from Link header
      const links = this.parseLinkHeader(response.headers.get("Link"));
      url = links.next;
    }

    return results;
  }

  /**
   * Convenience method for GET requests
   */
  async get<T>(
    path: string,
    params?: Record<string, string | string[] | number | boolean | undefined>
  ): Promise<T> {
    const { data } = await this.fetch<T>(path, { params });
    return data;
  }

  /**
   * Convenience method for GET requests that return arrays (with pagination)
   */
  async getAll<T>(
    path: string,
    params?: Record<string, string | string[] | number | boolean | undefined>
  ): Promise<T[]> {
    return this.fetchAll<T>(path, { params });
  }
}

// Singleton instance
let clientInstance: CanvasClient | null = null;

/**
 * Initialize the singleton client (call once at startup)
 */
export function initClient(options: ClientOptions): CanvasClient {
  clientInstance = new CanvasClient(options);
  return clientInstance;
}

/**
 * Get the singleton client instance
 */
export function getClient(): CanvasClient {
  if (!clientInstance) {
    throw new Error("Canvas client not initialized. Call initClient() first.");
  }
  return clientInstance;
}
