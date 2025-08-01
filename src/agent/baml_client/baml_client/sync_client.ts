/*************************************************************************************************

Welcome to Baml! To use this generated code, please run one of the following:

$ npm install @boundaryml/baml
$ yarn add @boundaryml/baml
$ pnpm add @boundaryml/baml

*************************************************************************************************/

// This file was generated by BAML: please do not edit it. Instead, edit the
// BAML files and re-generate this code using: baml-cli generate
// You can install baml-cli with:
//  $ npm install @boundaryml/baml
//
/* eslint-disable */
// tslint:disable
// @ts-nocheck
// biome-ignore format: autogenerated code

import type { BamlRuntime, FunctionResult, BamlCtxManager, Image, Audio, Pdf, Video, ClientRegistry, Collector } from "@boundaryml/baml"
import { toBamlError, type HTTPRequest } from "@boundaryml/baml"
import type { Checked, Check, RecursivePartialNull as MovedRecursivePartialNull } from "./types"
import type * as types from "./types"
import type {Company, Event, EventWithDetails, Person, Sponsor} from "./types"
import type TypeBuilder from "./type_builder"
import { HttpRequest, HttpStreamRequest } from "./sync_request"
import { LlmResponseParser, LlmStreamParser } from "./parser"
import { DO_NOT_USE_DIRECTLY_UNLESS_YOU_KNOW_WHAT_YOURE_DOING_CTX, DO_NOT_USE_DIRECTLY_UNLESS_YOU_KNOW_WHAT_YOURE_DOING_RUNTIME } from "./globals"

/**
 * @deprecated Use RecursivePartialNull from 'baml_client/types' instead.
 * Example:
 * ```ts
 * import { RecursivePartialNull } from './baml_client/types'
 * ```
 */
export type RecursivePartialNull<T> = MovedRecursivePartialNull<T>;

type BamlCallOptions = {
  tb?: TypeBuilder
  clientRegistry?: ClientRegistry
  collector?: Collector | Collector[]
  env?: Record<string, string | undefined>
}

export class BamlSyncClient {
  private httpRequest: HttpRequest
  private httpStreamRequest: HttpStreamRequest
  private llmResponseParser: LlmResponseParser
  private llmStreamParser: LlmStreamParser
  private bamlOptions: BamlCallOptions

  constructor(private runtime: BamlRuntime, private ctxManager: BamlCtxManager, bamlOptions?: BamlCallOptions) {
    this.httpRequest = new HttpRequest(runtime, ctxManager)
    this.httpStreamRequest = new HttpStreamRequest(runtime, ctxManager)
    this.llmResponseParser = new LlmResponseParser(runtime, ctxManager)
    this.llmStreamParser = new LlmStreamParser(runtime, ctxManager)
    this.bamlOptions = bamlOptions || {}
  }

  withOptions(bamlOptions: BamlCallOptions) {
    return new BamlSyncClient(this.runtime, this.ctxManager, bamlOptions)
  }

  /*
  * @deprecated NOT IMPLEMENTED as streaming must by async. We
  * are not providing an async version as we want to reserve the
  * right to provide a sync version in the future.
  */
  get stream() {
    throw new Error("stream is not available in BamlSyncClient. Use `import { b } from 'baml_client/async_client")
  }

  get request() {
    return this.httpRequest
  }

  get streamRequest() {
    return this.httpStreamRequest
  }

  get parse() {
    return this.llmResponseParser
  }

  get parseStream() {
    return this.llmStreamParser
  }

  
  ExtractEvents(
      searchResults: string,
      __baml_options__?: BamlCallOptions
  ): types.EventWithDetails[] {
    try {
      const options = { ...this.bamlOptions, ...(__baml_options__ || {}) }
      const collector = options.collector ? (Array.isArray(options.collector) ? options.collector : [options.collector]) : [];
      const rawEnv = __baml_options__?.env ? { ...process.env, ...__baml_options__.env } : { ...process.env };
      const env: Record<string, string> = Object.fromEntries(
        Object.entries(rawEnv).filter(([_, value]) => value !== undefined) as [string, string][]
      );
      const raw = this.runtime.callFunctionSync(
        "ExtractEvents",
        {
          "searchResults": searchResults
        },
        this.ctxManager.cloneContext(),
        options.tb?.__tb(),
        options.clientRegistry,
        collector,
        env,
      )
      return raw.parsed(false) as types.EventWithDetails[]
    } catch (error: any) {
      throw toBamlError(error);
    }
  }
  
  ResearchEvents(
      location: string,year: number,topic: string,
      __baml_options__?: BamlCallOptions
  ): types.EventWithDetails[] {
    try {
      const options = { ...this.bamlOptions, ...(__baml_options__ || {}) }
      const collector = options.collector ? (Array.isArray(options.collector) ? options.collector : [options.collector]) : [];
      const rawEnv = __baml_options__?.env ? { ...process.env, ...__baml_options__.env } : { ...process.env };
      const env: Record<string, string> = Object.fromEntries(
        Object.entries(rawEnv).filter(([_, value]) => value !== undefined) as [string, string][]
      );
      const raw = this.runtime.callFunctionSync(
        "ResearchEvents",
        {
          "location": location,"year": year,"topic": topic
        },
        this.ctxManager.cloneContext(),
        options.tb?.__tb(),
        options.clientRegistry,
        collector,
        env,
      )
      return raw.parsed(false) as types.EventWithDetails[]
    } catch (error: any) {
      throw toBamlError(error);
    }
  }
  
}

export const b = new BamlSyncClient(DO_NOT_USE_DIRECTLY_UNLESS_YOU_KNOW_WHAT_YOURE_DOING_RUNTIME, DO_NOT_USE_DIRECTLY_UNLESS_YOU_KNOW_WHAT_YOURE_DOING_CTX)