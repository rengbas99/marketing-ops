import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';

const TeamFeedPage = () => {
  const { data, loadCollections } = useData();

  useEffect(() => {
    loadCollections(['ASSET_COMMENTS', 'USERS', 'ASSETS']);
  }, [loadCollections]);

  const comments = data.ASSET_COMMENTS || [];
  const users = data.USERS || [];
  const assets = data.ASSETS || [];

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.name || email;
  };

  const getAssetTitle = (assetId) => {
    const asset = assets.find(a => a.asset_id === assetId);
    return asset?.title || 'Unknown Asset';
  };

  const sortedComments = [...comments]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Team Feed</h1>
        <p className="text-slate-600">Recent team activity and comments</p>
      </div>

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Comments</h2>
        {sortedComments.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {sortedComments.map((comment) => (
              <div key={comment.comment_id} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold">
                    {getUserName(comment.user_email).charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">{getUserName(comment.user_email)}</p>
                      <span className="text-xs text-slate-500">
                        {format(new Date(comment.timestamp), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{comment.comment_text}</p>
                    <p className="text-xs text-primary-600 font-medium">
                      On: {getAssetTitle(comment.asset_id)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamFeedPage;

