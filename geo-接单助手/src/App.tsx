/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AppState, PageId, CreatorOrder, ConnectedAccount, ChatMessage, TransactionRecord, UserProfile } from './types';
import { INITIAL_TASKS, INITIAL_ACCOUNTS, INITIAL_ORDERS, INITIAL_TRANSACTIONS } from './lib/initialData';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomeView from './components/HomeView';
import TaskView from './components/TaskView';
import OrderView from './components/OrderView';
import AccountView from './components/AccountView';
import EarningView from './components/EarningView';
import ProfileView from './components/ProfileView';

export default function App() {
  // Initialize full unified platform state
  const [state, setState] = useState<AppState>({
    currentTab: 'home',
    searchQuery: '',
    activeTaskId: null,
    activeOrderId: null,
    userScore: 920,
    tasks: INITIAL_TASKS,
    accounts: INITIAL_ACCOUNTS,
    orders: INITIAL_ORDERS,
    transactions: INITIAL_TRANSACTIONS,
    wallet: {
      extractable: 12480.0,
      frozen: 5600.0,
      accumulatedIncome: 32480.0,
    },
    profile: {
      name: '媒体人 小北',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxNJDf-b8vys4mCVqqf-bDTNxKo3Oy8ZlJXiaKhTRo7lBa9Vv3V2n-tEyrmxdxp6ah6UJIN4WUA-Wb0rGQoA0ZnqmQbYeLSijGzzvjMw8dqsg_rh58hhc2kLnkzkIA8OVsH-C5uRhh-ZnwW0zHhbxwryIdt0ydsUti4SHm4hfOgaY4AnMdiYmoOYz4ycH5V_4cSmF4X68HJ4vBAJw9gtI-Fu36BWKMKcgVzAmHbV3-_0xLKypUIrJtm7XPBtumGe03Tg7OvegXDVA8',
      status: 'accepting',
      completedOrdersCount: 18,
      ratingRate: 98,
      responseTime: '2h',
      verified: true,
      preferences: ['数码科技', '生活数码', '穿搭美妆', '美甲趋势', '探店分享'],
      safeLevel: 'high'
    }
  });

  // Navigation tab switcher
  const handleTabChange = (tab: PageId) => {
    setState((prev) => ({
      ...prev,
      currentTab: tab,
      activeTaskId: null,
      activeOrderId: null,
    }));
  };

  // Helper trigger shortcuts
  const handleSelectTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      currentTab: 'tasks',
      activeTaskId: taskId,
    }));
  };

  const handleSelectOrder = (orderId: string | null) => {
    setState((prev) => ({
      ...prev,
      currentTab: 'orders',
      activeOrderId: orderId,
    }));
  };

  // 1. Submit brand application trigger (Registers as Order & flips view)
  const handleApplyTask = (taskId: string, accountId: string, deliveryDate: string, notes: string) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Create a new active order running in 'creating' status
    const newOrderId = `order-${Date.now()}`;
    const newOrder: CreatorOrder = {
      id: newOrderId,
      taskId: taskId,
      platform: task.platform,
      brand: task.brand,
      title: `${task.title} (合作案)`,
      coverImage: task.coverImage,
      budget: task.budget,
      deadline: `${deliveryDate} 23:59`,
      status: 'creating', // Approved instantly for great user experience
      accountId: accountId,
      deliveryDate: deliveryDate,
      notes: notes,
      messages: [
        {
          id: 'msg-1',
          sender: 'brand',
          senderName: task.brand,
          avatar: '',
          content: `🎉 达人您好！品牌方已通过您的申请。选择的资源账号「${
            state.accounts.find((a) => a.id === accountId)?.name || '小红书账号'
          }」与我们要求高度契合！期待您的精美文稿创作。如有疑问或者文案亮点设想，可在下方与我们随时发起实时线上沟通。`,
          time: '1分钟前',
        },
      ],
      history: [
        { title: '发起合作接单申请', operator: '媒体人 小北', time: '刚刚' },
        { title: '品牌方系统匹配审核通过', operator: task.brand, time: '刚刚 animate' },
      ],
    };

    setState((prev) => {
      // Increment task applicants count
      const updatedTasks = prev.tasks.map((t) =>
        t.id === taskId ? { ...t, applicantsCount: t.applicantsCount + 1 } : t
      );
      
      // Increment level score up to max limit 1200
      const nextScore = Math.min(1200, prev.userScore + 105);

      return {
        ...prev,
        tasks: updatedTasks,
        orders: [newOrder, ...prev.orders],
        userScore: nextScore,
        activeTaskId: null,
        activeOrderId: newOrderId,
        currentTab: 'orders', // Flip directly to order detailed workspace!
      };
    });
  };

  // 2. Deliver article Draft work trigger (Flips status to 'checking')
  const handleDeliverOrder = (orderId: string, deliveryUrl: string, fileName: string, notes: string) => {
    setState((prev) => {
      const updatedOrders = prev.orders.map((order) => {
        if (order.id !== orderId) return order;

        // Append message thread and history audits
        const brandReply: ChatMessage = {
          id: `msg-rep-${Date.now()}`,
          sender: 'brand',
          senderName: order.brand,
          avatar: '',
          content: `📄 好的，品牌方已收到您交付的文件「${fileName}」或链接！我们已安排质检运营部门进行精美度与曝光设置抽检，确认无抄袭、洗稿后即将在 24 小时内办理收益清算拨付，请保持信心及顺畅交流。`,
          time: '刚刚',
        };

        const creatorSubmit: ChatMessage = {
          id: `msg-sub-${Date.now()}`,
          sender: 'creator',
          senderName: '媒体人 小北',
          avatar: '',
          content: `完成交付：稿件素材已上传到服务器。${notes ? `说明：${notes}` : ''}`,
          time: '刚刚',
        };

        return {
          ...order,
          status: 'checking' as const,
          messages: [...order.messages, creatorSubmit, brandReply],
          history: [
            ...order.history,
            { title: `提交验收资产 「${fileName}」`, operator: '媒体人 小北', time: '刚刚' },
            { title: '待品牌质检部门最终核准', operator: order.brand, time: '刚刚' },
          ],
        };
      });

      return {
        ...prev,
        orders: updatedOrders,
      };
    });
  };

  // 3. Post chat message to active order console Thread (With responsive auto feedback)
  const handleAddChatMessage = (orderId: string, text: string) => {
    setState((prev) => {
      const updatedOrders = prev.orders.map((order) => {
        if (order.id !== orderId) return order;

        const myMsg: ChatMessage = {
          id: `msg-me-${Date.now()}`,
          sender: 'creator',
          senderName: '媒体人 小北',
          avatar: '',
          content: text,
          time: '刚刚',
        };

        // Construct instant friendly brand feedback
        const autoMsg: ChatMessage = {
          id: `msg-auto-${Date.now()}`,
          sender: 'brand',
          senderName: order.brand,
          avatar: '',
          content: `收到！「小北」您的发言很有远见，这方面的调整在品牌核算时我们会重点配合记录在案。加油创作😊`,
          time: '刚刚',
        };

        return {
          ...order,
          messages: [...order.messages, myMsg, autoMsg],
        };
      });

      return {
        ...prev,
        orders: updatedOrders,
      };
    });
  };

  // 4. Money Withdrawal
  const handleWithdrawFunds = (amount: number) => {
    setState((prev) => {
      const remainingCash = Math.max(0, prev.wallet.extractable - amount);
      
      const newTx: TransactionRecord = {
        id: `TX-${Date.now()}`,
        title: '收益划转账户提现',
        brand: '结汇提款中心',
        amount: amount,
        type: 'withdrawal',
        status: 'success',
        time: '刚刚',
      };

      return {
        ...prev,
        wallet: {
          ...prev.wallet,
          extractable: remainingCash,
        },
        transactions: [newTx, ...prev.transactions],
      };
    });
  };

  // 5. Toggle linked account availability status block
  const handleToggleAccountStatus = (id: string) => {
    setState((prev) => {
      const updatedAccounts = prev.accounts.map((acc) =>
        acc.id === id ? { ...acc, canAccept: !acc.canAccept } : acc
      );
      return {
        ...prev,
        accounts: updatedAccounts,
      };
    });
  };

  // 6. Bind/Connect a new Account
  const handleAddAccount = (newAcc: Omit<ConnectedAccount, 'id'>) => {
    const freshAccount: ConnectedAccount = {
      ...newAcc,
      id: (state.accounts.length + 1).toString(),
    };
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, freshAccount],
    }));
  };

  // 7. Click to trigger high completeness scores
  const handleUpgradeCreator = () => {
    setState((prev) => ({
      ...prev,
      userScore: Math.min(1200, prev.userScore + 180),
    }));
  };

  // 8. Update User Profile State
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setState((prev) => ({
      ...prev,
      profile: updatedProfile,
    }));
  };

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] font-sans antialiased overflow-hidden">
      {/* Sidebar navigation panel */}
      <Sidebar
        currentTab={state.currentTab}
        onTabChange={handleTabChange}
        userScore={state.userScore}
        onUpgrade={handleUpgradeCreator}
      />

      {/* Main body wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global sticky Search Header */}
        <Header
          searchQuery={state.searchQuery}
          onSearchChange={(query) => setState((prev) => ({ ...prev, searchQuery: query }))}
          userScore={state.userScore}
          userName={state.profile.name}
          avatarUrl={state.profile.avatar}
          onNavigateToProfile={() => handleTabChange('profile')}
        />

        {/* Scrollable contents panel */}
        <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="max-w-6xl mx-auto pb-12">
            {state.currentTab === 'home' && (
              <HomeView
                state={state}
                onNavigateToTab={handleTabChange}
                onSelectTask={handleSelectTask}
                onSelectOrder={handleSelectOrder}
              />
            )}

            {state.currentTab === 'tasks' && (
              <TaskView
                state={state}
                onSelectTask={handleSelectTask}
                onBackToHall={() => setState((prev) => ({ ...prev, activeTaskId: null }))}
                onApplyTask={handleApplyTask}
              />
            )}

            {state.currentTab === 'orders' && (
              <OrderView
                state={state}
                onSelectOrder={handleSelectOrder}
                onDeliverOrder={handleDeliverOrder}
                onAddChatMessage={handleAddChatMessage}
              />
            )}

            {state.currentTab === 'accounts' && (
              <AccountView
                state={state}
                onToggleAccountStatus={handleToggleAccountStatus}
                onAddAccount={handleAddAccount}
                onEditAccountSelection={() => {}}
              />
            )}

            {state.currentTab === 'earnings' && (
              <EarningView
                state={state}
                onWithdrawFunds={handleWithdrawFunds}
              />
            )}

            {state.currentTab === 'profile' && (
              <ProfileView
                state={state}
                onUpdateProfile={handleUpdateProfile}
                onUpgrade={handleUpgradeCreator}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
