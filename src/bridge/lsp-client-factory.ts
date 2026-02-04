import { LSPClient } from '../lsp-client';
import {
  StartBody,
  BadRequestError,
  TypescriptStartBody,
  PythonStartBody,
  JavaStartBody,
  RustStartBody,
  RubyStartBody,
  PerlStartBody,
  CppStartBody,
  CsharpStartBody,
  SqlStartBody,
  CobolStartBody,
  BashStartBody,
  TerraformStartBody,
  ClojureStartBody,
  KotlinStartBody,
} from './bridge-types';

import { createTypescriptLspClient } from '../lsp-server/typescript-lsp-server';
import { createPythonLspClient } from '../lsp-server/python-lsp-server';
import { createJavaLspClient } from '../lsp-server/java-lsp-server';
import { createRustLspClient } from '../lsp-server/rust-lsp-server';
import { createRubyLspClient } from '../lsp-server/ruby-lsp-server';
import { createPerlLspClient } from '../lsp-server/perl-lsp-server';
import { createCppLspClient } from '../lsp-server/cpp-lsp-server';
import { createCsharpLspClient } from '../lsp-server/csharp-lsp-server';
import { createSqlLspClient } from '../lsp-server/sql-lsp-server';
import { createCobolLspClient } from '../lsp-server/cobol-lsp-server';
import { createBashLspClient } from '../lsp-server/bash-lsp-server';
import { createTerraformLspClient } from '../lsp-server/terraform-lsp-server';
import { createClojureLspClient } from '../lsp-server/clojure-lsp-server';
import { createKotlinLspClient } from '../lsp-server/kotlin-lsp-server';

export function createLspClientForLanguage(body: StartBody): LSPClient {
  switch (body.language) {
    case 'typescript': {
      const opts = body as TypescriptStartBody;
      return createTypescriptLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'python': {
      const opts = body as PythonStartBody;
      return createPythonLspClient({
        rootUri: opts.rootUri,
        serverDir: opts.serverDir,
        serverArgs: opts.serverArgs,
      });
    }
    case 'java': {
      const opts = body as JavaStartBody;
      return createJavaLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'rust': {
      const opts = body as RustStartBody;
      return createRustLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'ruby': {
      const opts = body as RubyStartBody;
      return createRubyLspClient({
        rootUri: opts.rootUri,
        cwd: opts.cwd,
        serverArgs: opts.serverArgs,
      });
    }
    case 'perl': {
      const opts = body as PerlStartBody;
      return createPerlLspClient({
        rootUri: opts.rootUri,
        serverPath: opts.serverPath,
        serverArgs: opts.serverArgs,
      });
    }
    case 'cpp': {
      const opts = body as CppStartBody;
      return createCppLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'csharp': {
      const opts = body as CsharpStartBody;
      return createCsharpLspClient({
        rootUri: opts.rootUri,
        solutionPath: opts.solutionPath,
        logLevel: opts.logLevel,
        serverArgs: opts.serverArgs,
      });
    }
    case 'sql': {
      const opts = body as SqlStartBody;
      return createSqlLspClient({
        rootUri: opts.rootUri,
        serverPath: opts.serverPath,
        serverArgs: opts.serverArgs,
      });
    }
    case 'cobol': {
      const opts = body as CobolStartBody;
      return createCobolLspClient({
        rootUri: opts.rootUri,
        serverJar: opts.serverJar,
        port: opts.port,
        host: opts.host,
      });
    }
    case 'bash': {
      const opts = body as BashStartBody;
      return createBashLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'terraform': {
      const opts = body as TerraformStartBody;
      return createTerraformLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'clojure': {
      const opts = body as ClojureStartBody;
      return createClojureLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'kotlin': {
      const opts = body as KotlinStartBody;
      return createKotlinLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    default:
      throw new BadRequestError(`Unsupported language: ${(body as StartBody).language}`);
  }
}
