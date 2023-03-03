import { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  sendAccountAbstraction,
  shouldDisplayReconnectButton,
  getAbstractAccount,
  // getExternalOwnedAccount,
} from '../utils';
import {
  // ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  SendAccountAbstractionButton,
  Card,
  Select,
  Form,
} from '../components';
import deployments from '../../../truffle/deployments.json';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error.muted};
  border: 1px solid ${({ theme }) => theme.colors.error.default};
  color: ${({ theme }) => theme.colors.error.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const WalletAddress = styled.div`
  font-size: 0.6em;
`;

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [gasPaymentChainId, setGasPaymentChainId] = useState('5');
  const [gasPaymentTokenList, setGasPaymentTokenList] = useState([]);
  // const [eoaWallet, setEOAWallet] = useState('');
  const [aaWallet, setAAWallet] = useState('');

  // TODO: update using squid api
  const [gasPaymentToken, setGasPaymentToken] = useState(
    deployments.mockERC20Address,
  );

  useEffect(() => {
    const isFlaskConnected = shouldDisplayReconnectButton(state.installedSnap);
    if (!isFlaskConnected) {
      return;
    }
    // getExternalOwnedAccount().then((address) => setEOAWallet(address));
    getAbstractAccount().then((address) => setAAWallet(address));
  }, [state.installedSnap]);

  useEffect(() => {
    if (!gasPaymentChainId) {
      return;
    }

    fetch(
      `${'http://localhost:8001/getSupportedPaymentTokens'}?chainId=${gasPaymentChainId}`,
    )
      .then((response) => response.json())
      .then((data) => {
        const _gasPaymentTokenList = data.map(({ address, name }: any) => {
          return { value: address, label: name };
        });
        _gasPaymentTokenList.unshift({
          value: deployments.mockERC20Address,
          label: 'Mock Payment Token',
        });
        setGasPaymentTokenList(_gasPaymentTokenList);
      });
  }, [gasPaymentChainId]);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleAccountAbstractionClick = async () => {
    try {
      await sendAccountAbstraction(gasPaymentChainId, gasPaymentToken);
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  return (
    <Container>
      <Heading>
        Welcome to <Span>CrossFuel</Span>
      </Heading>
      <Subtitle>Cross-chain gas payment infrastructure</Subtitle>
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!state.isFlask && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {/* {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!state.isFlask}
                />
              ),
            }}
            disabled={!state.isFlask}
          />
        )}
        {shouldDisplayReconnectButton(state.installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
              button: (
                <ReconnectButton
                  onClick={handleConnectClick}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
          />
        )} */}

        <Card
          content={{
            title: 'Account Abstraction',
            others: (
              <>
                {aaWallet && (
                  <>
                    <Form
                      label="Address"
                      input={<WalletAddress>{aaWallet}</WalletAddress>}
                    />
                    <Form
                      label="Receive Fund"
                      input={<QRCodeSVG value={aaWallet} />}
                    />
                  </>
                )}
              </>
            ),
            button: (
              <ReconnectButton
                onClick={handleConnectClick}
                disabled={!state.installedSnap}
              />
            ),
          }}
          disabled={!state.installedSnap}
        />

        <Card
          content={{
            title: 'Cross-Chain Gas Payment with Account Abstraction',
            others: (
              <>
                <Form
                  label="Payment Network"
                  input={
                    <Select
                      onChange={(e) => {
                        setGasPaymentChainId(e.target.value);
                      }}
                      options={[
                        {
                          value: '5',
                          label: 'Goerli',
                        },
                        {
                          value: '80001',
                          label: 'Polygon Mumbai',
                        },
                      ]}
                    />
                  }
                />
                <Form
                  label="Payment Token"
                  input={
                    <Select
                      onChange={(e) => {
                        setGasPaymentToken(e.target.value);
                      }}
                      options={gasPaymentTokenList}
                    />
                  }
                />
                <Form label="Current Balance" input={<></>} />
              </>
            ),
            button: (
              <SendAccountAbstractionButton
                onClick={handleAccountAbstractionClick}
                disabled={!state.installedSnap}
              />
            ),
          }}
          disabled={!state.installedSnap}
        />
        <Notice>
          <p>
            CrossFuel is a payment system that simplifies gas fees for dApps on
            different blockchains using
            <b> Account Abstraction</b>. It eliminates the need to swap or
            bridge tokens, making transactions across multiple chains
            effortless.
          </p>
        </Notice>
      </CardContainer>
    </Container>
  );
};

export default Index;
