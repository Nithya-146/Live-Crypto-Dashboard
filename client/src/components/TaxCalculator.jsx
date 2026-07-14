import React, { useState, useEffect } from 'react';
import { IndianRupee, HelpCircle } from 'lucide-react';
import { formatPrice } from './TickerGrid';

export default function TaxCalculator({ currentPrices, currency, usdToInrRate }) {
  const [asset, setAsset] = useState('BTC');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Autofill current price as Sell Price if available
  useEffect(() => {
    if (currentPrices[asset]) {
      const currentPriceInCurrency = currency === 'INR' 
        ? currentPrices[asset] * usdToInrRate 
        : currentPrices[asset];
      setSellPrice(currentPriceInCurrency.toFixed(2));
      
      // Seed a realistic Buy Price (e.g. 5% lower) for demonstration
      setBuyPrice((currentPriceInCurrency * 0.95).toFixed(2));
    }
  }, [asset, currentPrices, currency, usdToInrRate]);

  const buyVal = parseFloat(buyPrice) || 0;
  const sellVal = parseFloat(sellPrice) || 0;
  const qty = parseFloat(quantity) || 0;

  const totalBuy = buyVal * qty;
  const totalSell = sellVal * qty;
  const rawProfit = totalSell - totalBuy;

  // Indian Crypto Tax Laws:
  // - 30% flat tax on net gains/profits (no deduction of expenses allowed other than acquisition cost)
  // - 1% TDS (Tax Deducted at Source) on total sell consideration value
  const taxRate = 0.30;
  const tdsRate = 0.01;

  const capitalGainsTax = rawProfit > 0 ? rawProfit * taxRate : 0;
  const tdsDeducted = totalSell * tdsRate;
  
  // Net receivable = Total Sell - Tax - TDS (losses are not deducted but TDS still applies)
  const netReceivable = totalSell - capitalGainsTax - tdsDeducted;

  // Let's ensure calculations display cleanly in INR for tax report accuracy, since tax is paid in INR.
  const rateToInr = currency === 'INR' ? 1 : usdToInrRate;
  const totalBuyInr = totalBuy * rateToInr;
  const totalSellInr = totalSell * rateToInr;
  const rawProfitInr = rawProfit * rateToInr;
  const capitalGainsTaxInr = capitalGainsTax * rateToInr;
  const tdsDeductedInr = tdsDeducted * rateToInr;
  const netReceivableInr = netReceivable * rateToInr;

  const formatInr = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="glass-card tax-card">
      <div className="panel-header">
        <div className="panel-title">
          <IndianRupee size={18} style={{ color: 'var(--primary)' }} />
          <span>India Crypto Tax Calc</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="tax-row">
          <div className="tax-input-group">
            <label className="alert-label">Asset</label>
            <select
              className="alert-select"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            >
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="SOL">SOL</option>
            </select>
          </div>

          <div className="tax-input-group">
            <label className="alert-label">Quantity</label>
            <input
              type="number"
              className="alert-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1.0"
              step="any"
            />
          </div>
        </div>

        <div className="tax-row">
          <div className="tax-input-group">
            <label className="alert-label">Buy Price ({currency})</label>
            <input
              type="number"
              className="alert-input"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Buy price"
              step="any"
            />
          </div>

          <div className="tax-input-group">
            <label className="alert-label">Sell Price ({currency})</label>
            <input
              type="number"
              className="alert-input"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="Sell price"
              step="any"
            />
          </div>
        </div>
      </div>

      <div className="tax-results">
        <div className="tax-result-row">
          <span className="tooltip-label">Investment:</span>
          <span className="tooltip-value">{formatPrice(totalBuy, currency, 1)}</span>
        </div>
        <div className="tax-result-row">
          <span className="tooltip-label">Revenue:</span>
          <span className="tooltip-value">{formatPrice(totalSell, currency, 1)}</span>
        </div>
        <div className="tax-result-row">
          <span className="tooltip-label">Profit/Loss:</span>
          <span className={`tooltip-value ${rawProfit >= 0 ? 'success' : 'danger'}`}>
            {rawProfit >= 0 ? '+' : ''}{formatPrice(rawProfit, currency, 1)}
          </span>
        </div>
        <div className="tax-result-row">
          <span className="tooltip-label">Flat Tax (30%):</span>
          <span className="tooltip-value danger">
            -{formatPrice(capitalGainsTax, currency, 1)}
          </span>
        </div>
        <div className="tax-result-row">
          <span className="tooltip-label">TDS (1%):</span>
          <span className="tooltip-value" style={{ color: 'var(--warning)' }}>
            -{formatPrice(tdsDeducted, currency, 1)}
          </span>
        </div>
        
        <div className="tax-result-row total">
          <span>Net Receive:</span>
          <span>{formatPrice(netReceivable, currency, 1)}</span>
        </div>
      </div>

      {/* Localized tax details report */}
      <div className="tax-results" style={{ background: 'rgba(0, 242, 254, 0.02)', borderColor: 'rgba(0, 242, 254, 0.1)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          INR Valuation (Govt. Reporting)
        </div>
        <div className="tax-result-row" style={{ fontSize: '12px' }}>
          <span>Taxable Gain:</span>
          <span style={{ fontWeight: '600' }}>{formatInr(Math.max(0, rawProfitInr))}</span>
        </div>
        <div className="tax-result-row" style={{ fontSize: '12px' }}>
          <span>CGT Liability:</span>
          <span className="danger" style={{ fontWeight: '600' }}>{formatInr(capitalGainsTaxInr)}</span>
        </div>
        <div className="tax-result-row" style={{ fontSize: '12px' }}>
          <span>TDS Deducted:</span>
          <span style={{ color: 'var(--warning)', fontWeight: '600' }}>{formatInr(tdsDeductedInr)}</span>
        </div>
      </div>

      <div className="tax-infobox">
        <HelpCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
        Under Section 115BBH of the IT Act (India), Virtual Digital Assets (VDA) are taxed flat at 30% without indexation benefits. A 1% TDS applies on transfer values under Section 194S.
      </div>
    </div>
  );
}
