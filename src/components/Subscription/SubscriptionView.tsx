/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Plan, PaymentOrder } from '../../types';
import {
  CreditCard,
  Check,
  Sparkles,
  ShieldAlert,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  X,
  ExternalLink,
  Lock,
} from 'lucide-react';

export const SubscriptionView: React.FC = () => {
  const {
    organization,
    subscription,
    remainingTrialSeconds,
    isTrialExpired,
    formatTrialCountdown,
    refreshMe,
  } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [history, setHistory] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Checkout Modal State
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<Plan | null>(null);
  const [phone, setPhone] = useState<string>('');
  const [operator, setOperator] = useState<string>('orange_money');
  const [country, setCountry] = useState<string>(organization?.country || 'Cameroun');
  const [currency, setCurrency] = useState<string>(organization?.currency || 'XAF');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'waiting_ussd' | 'success' | 'failed'>('form');
  const [ussdInstructions, setUssdInstructions] = useState<string>('');
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<PaymentOrder | null>(null);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [plansRes, historyRes] = await Promise.all([
        api.getPlans(),
        api.getPaymentHistory(),
      ]);
      setPlans(plansRes.plans || []);
      setHistory(historyRes.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
    if (organization?.phone) {
      setPhone(organization.phone.replace(/[^0-9+]/g, ''));
    }
  }, [organization]);

  const openCheckout = (plan: Plan) => {
    setSelectedPlanForCheckout(plan);
    setCheckoutStep('form');
    setModalFeedback(null);
    setCurrentOrder(null);
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForCheckout || !phone) return;

    setIsProcessing(true);
    setModalFeedback(null);

    try {
      const res = await api.initializePayment({
        planId: selectedPlanForCheckout.id,
        phone,
        operator,
        country,
        currency,
        billingCycle,
      });

      setCurrentOrder(res.order);
      setUssdInstructions(res.instructions);
      setCheckoutStep('waiting_ussd');
    } catch (err: any) {
      setModalFeedback(err.message || 'Erreur lors de l’initialisation du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sandbox trigger to simulate customer validating on their phone
  const handleSimulateSandboxCallback = async (simulateStatus: 'confirmed' | 'failed') => {
    if (!currentOrder) return;
    setIsProcessing(true);
    setModalFeedback(null);

    try {
      const res = await api.simulateSandboxPayment(
        currentOrder.reference,
        simulateStatus,
        simulateStatus === 'failed' ? 'Délai d’attente USSD expiré ou solde insuffisant' : undefined
      );

      if (simulateStatus === 'confirmed') {
        setCheckoutStep('success');
        setCurrentOrder(res.order);
        await refreshMe();
        await loadSubscriptionData();
      } else {
        setCheckoutStep('failed');
        setCurrentOrder(res.order);
      }
    } catch (err: any) {
      setModalFeedback(err.message || 'Erreur simulation sandbox');
    } finally {
      setIsProcessing(false);
    }
  };

  const isTrial = subscription?.planCode === 'trial';

  return (
    <div className="space-y-8">
      {/* Current Subscription Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Offre actuelle :
              </span>
              <h2 className="text-xl font-bold text-white capitalize">
                {isTrial ? 'Essai Gratuit 72h' : subscription?.planCode}
              </h2>
              {isTrial && !isTrialExpired && (
                <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                  En cours
                </span>
              )}
              {isTrialExpired && (
                <span className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-medium">
                  Expiré (Lecture seule)
                </span>
              )}
              {subscription?.status === 'active' && !isTrial && (
                <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                  Abonnement Actif
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Organisation : <span className="text-white font-medium">{organization?.name}</span> ({organization?.country})
            </p>
          </div>

          {/* Trial countdown timer display */}
          {isTrial && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-right">
              <span className="text-[11px] text-slate-400 block">Temps restant sur l’essai :</span>
              <span className={`text-base font-mono font-bold ${isTrialExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatTrialCountdown()}
              </span>
            </div>
          )}
        </div>

        {/* Details row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <p className="text-slate-400">Date de début</p>
            <p className="font-medium text-white mt-0.5">
              {subscription?.startsAt ? new Date(subscription.startsAt).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Date d’échéance</p>
            <p className="font-medium text-white mt-0.5">
              {subscription?.endsAt ? new Date(subscription.endsAt).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Capacité employés</p>
            <p className="font-medium text-white mt-0.5 font-mono">
              Jusqu’à {subscription?.maxEmployees || 5} collaborateurs
            </p>
          </div>
          <div>
            <p className="text-slate-400">Moyen de paiement</p>
            <p className="font-medium text-emerald-400 mt-0.5">
              {subscription?.paymentMethod || 'Mobile Money (SasPay)'}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Header & Billing Toggle */}
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-white">Choisissez votre formule PointAfrik</h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          Paiement simple et direct par Mobile Money (Orange Money, MTN MoMo, Wave, Moov). Sans engagement, activation instantanée.
        </p>

        {/* Toggle Mensuel / Annuel */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Facturation Mensuelle
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Annuelle</span>
            <span className="text-[10px] bg-emerald-400 text-slate-950 font-bold px-1.5 py-0.2 rounded">
              2 mois offerts
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans
          .filter((p) => p.code !== 'trial')
          .map((plan) => {
            const isCurrent = subscription?.planCode === plan.code && subscription?.status === 'active';
            const price = organization?.currency === 'XOF' ? plan.priceXOF : plan.priceXAF;
            const finalPrice = billingCycle === 'annual' ? price * 10 : price;
            const currencyLabel = organization?.currency || 'FCFA';

            return (
              <div
                key={plan.id}
                className={`bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between relative transition-all ${
                  plan.code === 'business'
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                    : 'border-slate-800'
                }`}
              >
                {plan.code === 'business' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                    Recommandé PME
                  </span>
                )}

                <div>
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                  <div className="mt-4 mb-6">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {finalPrice.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xs text-slate-400 font-medium ml-1">
                      {currencyLabel} / {billingCycle === 'annual' ? 'an' : 'mois'}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Jusqu’à {plan.maxEmployees} employés
                    </p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => openCheckout(plan)}
                    disabled={isCurrent}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-500 cursor-default'
                        : plan.code === 'business'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    {isCurrent ? (
                      'Forfait actuel actif'
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5" />
                        Payer via Mobile Money
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Payment History & Receipts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Historique des transactions Mobile Money</h3>
            <p className="text-xs text-slate-400">Reçus de paiement certifiés téléchargeables pour votre comptabilité.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                <th className="py-3 px-4 font-medium">Référence Commande</th>
                <th className="py-3 px-4 font-medium">Forfait</th>
                <th className="py-3 px-4 font-medium">Opérateur</th>
                <th className="py-3 px-4 font-medium">Montant</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Statut</th>
                <th className="py-3 px-4 text-right font-medium">Justificatif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Aucune transaction effectuée pour le moment.
                  </td>
                </tr>
              ) : (
                history.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-medium text-white">{order.reference}</td>
                    <td className="py-3 px-4 text-slate-300">{order.planName}</td>
                    <td className="py-3 px-4 uppercase font-semibold text-slate-300">
                      {order.operator.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {order.amount.toLocaleString('fr-FR')} {order.currency}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      {order.status === 'confirmed' ? (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmé
                        </span>
                      ) : order.status === 'pending' ? (
                        <span className="text-[11px] text-amber-400 font-medium">En attente USSD</span>
                      ) : (
                        <span className="text-[11px] text-rose-400 font-medium">Échoué</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => setActiveReceipt(order)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded text-[11px] inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          Reçu
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SasPay Checkout Modal with Sandbox Harness */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  SP
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Paiement Sécurisé SasPay Mobile Money</h3>
                  <p className="text-[11px] text-slate-400">Passerelle certifiée pour l’Afrique Francophone</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlanForCheckout(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalFeedback && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {modalFeedback}
              </div>
            )}

            {/* Step 1: Form */}
            {checkoutStep === 'form' && (
              <form onSubmit={handleStartPayment} className="space-y-4">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block">Forfait sélectionné :</span>
                    <span className="font-semibold text-white text-sm">{selectedPlanForCheckout.name} ({billingCycle === 'annual' ? '1 an' : '1 mois'})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Total à débiter :</span>
                    <span className="text-emerald-400 font-mono font-bold text-base">
                      {(billingCycle === 'annual'
                        ? (currency === 'XOF' ? selectedPlanForCheckout.priceXOF : selectedPlanForCheckout.priceXAF) * 10
                        : (currency === 'XOF' ? selectedPlanForCheckout.priceXOF : selectedPlanForCheckout.priceXAF)
                      ).toLocaleString('fr-FR')} {currency}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Pays</label>
                    <select
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        if (['Sénégal', 'Côte d’Ivoire', 'Bénin', 'Togo'].includes(e.target.value)) {
                          setCurrency('XOF');
                        } else {
                          setCurrency('XAF');
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                    >
                      <option value="Cameroun">Cameroun (XAF)</option>
                      <option value="Côte d’Ivoire">Côte d’Ivoire (XOF)</option>
                      <option value="Sénégal">Sénégal (XOF)</option>
                      <option value="Bénin">Bénin (XOF)</option>
                      <option value="Togo">Togo (XOF)</option>
                      <option value="Gabon">Gabon (XAF)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Opérateur</label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                    >
                      <option value="orange_money">Orange Money</option>
                      <option value="mtn_momo">MTN Mobile Money</option>
                      <option value="wave">Wave (Sénégal & CI)</option>
                      <option value="moov_money">Moov Money</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Numéro de téléphone Mobile Money *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+237 6XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Un prompt USSD ou une notification de confirmation sera envoyé à ce numéro.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanForCheckout(null)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    {isProcessing ? 'Génération commande...' : 'Lancer le paiement SasPay'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Waiting for USSD / Sandbox Harness */}
            {checkoutStep === 'waiting_ussd' && currentOrder && (
              <div className="space-y-4">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                    <Smartphone className="w-4 h-4 animate-bounce" />
                    <span>Instructions de validation sur votre téléphone :</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{ussdInstructions}</p>
                  <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>Réf : {currentOrder.reference}</span>
                    <span>Montant : {currentOrder.amount.toLocaleString('fr-FR')} {currentOrder.currency}</span>
                  </div>
                </div>

                {/* Explicit Sandbox Simulator Harness */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>Environnement Sandbox SasPay (Mode Test)</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Pour tester la confirmation immédiate du webhook signé par SasPay et l’activation instantanée de l’abonnement, utilisez les boutons ci-dessous :
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleSimulateSandboxCallback('confirmed')}
                      disabled={isProcessing}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Simuler succès (Webhook)
                    </button>
                    <button
                      onClick={() => handleSimulateSandboxCallback('failed')}
                      disabled={isProcessing}
                      className="py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Simuler échec / timeout
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {checkoutStep === 'success' && currentOrder && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Abonnement activé avec succès !</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Votre paiement SasPay a été validé. Reçu certifié N°{' '}
                  <span className="font-mono font-semibold text-emerald-400">{currentOrder.receiptNumber}</span>.
                </p>
                <div className="pt-3 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedPlanForCheckout(null);
                      setActiveReceipt(currentOrder);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                  >
                    Voir le reçu
                  </button>
                  <button
                    onClick={() => setSelectedPlanForCheckout(null)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Fermer et continuer
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Failed */}
            {checkoutStep === 'failed' && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Paiement non complété</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  La transaction n’a pas abouti. Aucun montant n’a été prélevé sur votre compte Mobile Money.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setCheckoutStep('form')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Downloadable / Printable Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 print:p-0 print:border-none print:bg-white print:text-black">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
              <h3 className="text-sm font-semibold text-white">Reçu Officiel de Paiement</h3>
              <button onClick={() => setActiveReceipt(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="bg-slate-800/40 print:bg-white p-5 rounded-xl border border-slate-800 print:border-slate-300 space-y-4 text-xs">
              <div className="flex justify-between items-start border-b border-slate-700 print:border-slate-300 pb-3">
                <div>
                  <h4 className="font-bold text-white print:text-black text-sm">PointAfrik SaaS</h4>
                  <p className="text-[11px] text-slate-400 print:text-slate-600">Passerelle SasPay Africa</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-400 print:text-emerald-700 font-bold block">
                    {activeReceipt.receiptNumber || 'REC-OFFICIEL'}
                  </span>
                  <span className="text-[10px] text-slate-400 print:text-slate-500">
                    {new Date(activeReceipt.confirmedAt || activeReceipt.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Client :</span>
                  <span className="font-medium text-white print:text-black">{activeReceipt.organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Forfait :</span>
                  <span className="font-medium text-white print:text-black">{activeReceipt.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Opérateur :</span>
                  <span className="font-medium text-white print:text-black uppercase">{activeReceipt.operator.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Téléphone :</span>
                  <span className="font-mono text-white print:text-black">{activeReceipt.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Réf SasPay :</span>
                  <span className="font-mono text-slate-300 print:text-slate-700">{activeReceipt.sasPayRef || activeReceipt.reference}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700 print:border-slate-300 flex justify-between items-center text-sm">
                <span className="font-bold text-white print:text-black">Montant Encaissé :</span>
                <span className="font-mono font-extrabold text-emerald-400 print:text-emerald-800 text-base">
                  {activeReceipt.amount.toLocaleString('fr-FR')} {activeReceipt.currency}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer le justificatif
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
