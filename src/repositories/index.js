import { FLAGS } from '../lib/featureFlags';
import { CloudRepository } from './CloudRepository';
import { LocalRepository } from './LocalRepository';

export const dataRepository = FLAGS.USE_CLOUD_API ? CloudRepository : LocalRepository;

export { CloudRepository, LocalRepository };

export default dataRepository;
