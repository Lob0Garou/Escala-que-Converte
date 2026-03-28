import { FLAGS } from '../lib/featureFlags';
import { supabase } from '../lib/supabase';

const isTrackingReady = () => Boolean(supabase && FLAGS.REQUIRE_AUTH);

const normalizeUploadType = (type) => {
  switch (type) {
    case 'escala':
      return 'schedule';
    case 'cupons':
      return 'traffic';
    case 'vendas':
      return 'sales';
    default:
      return type || 'unknown';
  }
};

export const syncUserAccess = async (user) => {
  if (!isTrackingReady() || !user?.id) return null;

  const { error } = await supabase.rpc('sync_user_access', {
    p_email: user.email ?? null,
    p_last_login_at: user.last_sign_in_at ?? null,
  });

  if (error) {
    console.warn('[activity] sync_user_access falhou:', error.message);
    return null;
  }

  return true;
};

export const logActivity = async ({
  action,
  entityType = null,
  entityId = null,
  storeId = null,
  metadata = {},
  errorCode = null,
} = {}) => {
  if (!isTrackingReady() || !action) return null;

  const { data, error } = await supabase.rpc('log_activity', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_store_id: storeId,
    p_metadata_json: metadata,
    p_error_code: errorCode,
  });

  if (error) {
    console.warn('[activity] log_activity falhou:', error.message);
    return null;
  }

  return data ?? null;
};

export const createUploadRecord = async ({
  userId,
  storeId,
  file,
  type,
  status = 'done',
  storagePath = null,
} = {}) => {
  if (!isTrackingReady() || !FLAGS.PERSIST_TO_SUPABASE) return null;
  if (!userId || !storeId || !file) return null;

  const payload = {
    store_id: storeId,
    file_type: normalizeUploadType(type),
    file_name: file.name,
    storage_path: storagePath,
    processing_status: status,
    uploaded_by: userId,
    file_size: file.size ?? null,
    mime_type: file.type || null,
  };

  const { data, error } = await supabase
    .from('uploaded_files')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.warn('[activity] uploaded_files insert falhou:', error.message);
    return null;
  }

  await logActivity({
    action: status === 'error' ? 'upload_failed' : 'upload_processed',
    entityType: 'uploaded_file',
    entityId: data?.id || null,
    storeId,
    metadata: {
      type: payload.file_type,
      fileName: payload.file_name,
      fileSize: payload.file_size,
      mimeType: payload.mime_type,
      status,
    },
    errorCode: status === 'error' ? 'upload_processing_failed' : null,
  });

  return data ?? null;
};

export default {
  syncUserAccess,
  logActivity,
  createUploadRecord,
};
