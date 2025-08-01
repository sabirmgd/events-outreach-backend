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

/**
 * If this import fails, you may need to upgrade @boundaryml/baml.
 * 
 * Please upgrade @boundaryml/baml to 0.202.1.
 * 
 * $ npm install @boundaryml/baml@0.202.1
 * $ yarn add @boundaryml/baml@0.202.1
 * $ pnpm add @boundaryml/baml@0.202.1
 * 
 * If nothing else works, please ask for help:
 * 
 * https://github.com/boundaryml/baml/issues
 * https://boundaryml.com/discord
 * 
 **/
import { ThrowIfVersionMismatch } from "@boundaryml/baml";

export const version = "0.202.1";

ThrowIfVersionMismatch(version);



export { b } from "./async_client"

export * from "./types"
export type { partial_types } from "./partial_types"
export * from "./tracing"
export { resetBamlEnvVars } from "./globals"
export { BamlClientHttpError, BamlValidationError, BamlClientFinishReasonError } from "@boundaryml/baml"