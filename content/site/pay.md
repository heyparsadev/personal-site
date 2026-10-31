---
# The page Parsa sends to clients: heyparsa.com/pay. It stays out of search and isn't linked from the site.
# Values with a kind are checked when the site builds, so a typo in the IBAN, the BIC or the bitcoin address fails the build.
title: Payment details
intro: Thanks for working with me. Pay whichever way suits you; every detail below copies with one tap.
methods:
  - name: Bank transfer
    note: In euros (EUR), by SEPA transfer.
    fields:
      - { label: Beneficiary, value: Parsa Kharazmian }
      - { label: IBAN, value: MT98CFTE28004000000000005059076, kind: iban }
      - { label: BIC / SWIFT, value: CFTEMTM1, kind: bic }
  - name: PayPal
    note: Send to my PayPal account.
    fields:
      - { label: PayPal email, value: kzn.parsa@gmail.com, kind: email }
  - name: Bitcoin
    note: Bitcoin (BTC) on the Bitcoin network only. Any other coin or network sent to this address is lost.
    fields:
      - { label: Bitcoin address, value: bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7, kind: btc }
reference: Please put your name or the invoice number in the payment reference, so I can match it.
contact: { text: "Questions about a payment?", email: me@heyparsa.com }
---
