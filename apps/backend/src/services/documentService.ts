import { Injectable } from '@gulux/gulux';
import DocumentRepository from '../repositories/documentRepository';

@Injectable()
export default class DocumentService {
  public constructor(private readonly documentRepository: DocumentRepository) {}

  public listDocuments() {
    return this.documentRepository.listDocuments();
  }
}
