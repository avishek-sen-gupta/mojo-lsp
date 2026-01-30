import {
  StartBody,
  DocumentOpenBody,
  DocumentChangeBody,
  DocumentCloseBody,
  PositionBody,
  ReferencesBody,
  SymbolsBody,
  ErrorResponse,
  SuccessResponse,
  StartResponse,
  StatusResponse,
  CompletionResponse,
  HoverResponse,
  DefinitionResponse,
  ReferencesResponse,
  SymbolsResponse,
  DiagnosticsResponse,
} from '../bridge-types';

export type StartRoute = {
  Body: StartBody;
  Reply: StartResponse | ErrorResponse;
};

export type StopRoute = {
  Reply: SuccessResponse | ErrorResponse;
};

export type StatusRoute = {
  Reply: StatusResponse;
};

export type DocumentOpenRoute = {
  Body: DocumentOpenBody;
  Reply: SuccessResponse | ErrorResponse;
};

export type DocumentChangeRoute = {
  Body: DocumentChangeBody;
  Reply: SuccessResponse | ErrorResponse;
};

export type DocumentCloseRoute = {
  Body: DocumentCloseBody;
  Reply: SuccessResponse | ErrorResponse;
};

export type CompletionRoute = {
  Body: PositionBody;
  Reply: CompletionResponse | ErrorResponse;
};

export type HoverRoute = {
  Body: PositionBody;
  Reply: HoverResponse | ErrorResponse;
};

export type DefinitionRoute = {
  Body: PositionBody;
  Reply: DefinitionResponse | ErrorResponse;
};

export type ReferencesRoute = {
  Body: ReferencesBody;
  Reply: ReferencesResponse | ErrorResponse;
};

export type SymbolsRoute = {
  Body: SymbolsBody;
  Reply: SymbolsResponse | ErrorResponse;
};

export type DiagnosticsGetRoute = {
  Reply: DiagnosticsResponse;
};

export type DiagnosticsDeleteRoute = {
  Reply: SuccessResponse;
};
