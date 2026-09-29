import { EditorClient } from './editor-client';

import { fetchEditorData } from '@/features/editor/actions.server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export default async function TestEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workspace, data] = await Promise.all([getCurrentWorkspace(), fetchEditorData(id)]);

  return <EditorClient data={data} workspaceId={workspace.id} />;
}
