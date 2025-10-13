import { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { useAuth } from '../lib/AuthContext';
import { idlFactory } from '../../backend/declarations/backend.did.js';
import type { _SERVICE } from '../../backend/declarations/backend.did';

const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';

interface LeaderboardEntry {
  principal: Principal;
  points: bigint;
  rank: number;
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<bigint>(BigInt(0));
  const [currentWeek, setCurrentWeek] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const { isAuthenticated, principal } = useAuth();

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentWeek]);

  const updateCountdown = () => {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    const timeLeft = nextMonday.getTime() - now.getTime();

    if (timeLeft <= 0) {
      setTimeUntilReset('Resetting...');
      return;
    }

    const seconds = Math.floor(timeLeft / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    setTimeUntilReset(`${days}d ${hours}h ${minutes}m`);
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      const agent = new HttpAgent({ host: 'https://ic0.app' });
      const backend = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      const week = await backend.get_current_week();
      setCurrentWeek(week);

      const top20 = await backend.get_leaderboard([week], BigInt(20));
      const entries: LeaderboardEntry[] = top20.map(([principal, points], index) => ({
        principal,
        points,
        rank: index + 1,
      }));

      setLeaderboard(entries);

      if (isAuthenticated && principal) {
        const userPrincipal = typeof principal === 'string' ? Principal.fromText(principal) : principal;
        const points = await backend.get_user_weekly_points([userPrincipal], week);
        setUserPoints(points);

        const principalText = typeof principal === 'string' ? principal : principal.toText();
        const userEntry = entries.findIndex(e => e.principal.toText() === principalText);
        if (userEntry !== -1) {
          setUserRank(userEntry + 1);
        } else {
          setUserRank(null);
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrincipal = (principal: Principal) => {
    const text = principal.toText();
    return `${text.slice(0, 5)}...${text.slice(-4)}`;
  };

  const getPrizeAmount = (rank: number) => {
    if (rank === 1) return '$50';
    if (rank === 2) return '$30';
    if (rank === 3) return '$20';
    return null;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-400" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
              <div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4">Leaderboard</h1>
                <p className="text-gray-400 text-lg max-w-2xl">
                  Compete for weekly prizes by trading bundles
                </p>
              </div>

              {timeUntilReset && (
                <div className="bg-white/5 border border-white/10 px-6 py-3 w-full md:w-auto md:flex-shrink-0">
                  <div className="text-gray-400 text-sm mb-1">Week resets in</div>
                  <div className="text-2xl font-bold text-white">{timeUntilReset}</div>
                </div>
              )}
            </div>
          </div>

          {isAuthenticated && userPoints > 0 && (
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-400/30 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Your Points This Week</div>
                  <div className="text-3xl font-bold text-white">{Number(userPoints).toLocaleString()}</div>
                </div>
                {userRank && (
                  <div className="text-right">
                    <div className="text-gray-400 text-sm mb-1">Your Rank</div>
                    <div className="text-3xl font-bold text-yellow-400">#{userRank}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 mb-8">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white mb-2">Top 20 This Week</h2>
              <p className="text-gray-400 text-sm">
                Winners announced every Monday • Prizes distributed within 24h
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-12 text-center">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No entries yet. Be the first to trade!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Rank</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">User</th>
                    <th className="text-right py-4 px-6 text-gray-400 font-medium">Points</th>
                    <th className="text-right py-4 px-6 text-gray-400 font-medium">Potential Winning</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => {
                    const isCurrentUser = principal && entry.principal.toText() === principal;
                    const prize = getPrizeAmount(entry.rank);

                    return (
                      <tr
                        key={entry.principal.toText()}
                        className={`border-b border-white/5 ${
                          isCurrentUser ? 'bg-yellow-400/10' : 'hover:bg-white/5'
                        } transition-colors`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {getRankIcon(entry.rank)}
                            <span className="text-white font-bold text-lg">
                              #{entry.rank}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono">
                              {formatPrincipal(entry.principal)}
                            </span>
                            {isCurrentUser && (
                              <span className="bg-yellow-400/20 text-yellow-400 text-xs px-2 py-1">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-white font-bold text-lg">
                            {Number(entry.points).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {prize ? (
                            <span className="bg-green-500/20 text-green-400 px-3 py-1 font-bold">
                              {prize}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex gap-3">
                <span className="text-yellow-400">•</span>
                <span>Earn 1 point for every cent spent buying bundles</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400">•</span>
                <span>Lose 1 point for every cent from selling bundles</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400">•</span>
                <span>Top 3 traders each week win cash prizes ($50 / $30 / $20)</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400">•</span>
                <span>Leaderboard resets every Monday at 00:00 UTC</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400">•</span>
                <span>Prizes distributed within 24 hours after week ends</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
