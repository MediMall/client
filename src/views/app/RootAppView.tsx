import React, { useEffect, useState } from 'react'
import { IonApp } from '@ionic/react'

import { Progress, Toast } from 'components'
import { sessionAvailable } from 'session'

import { watchPosition as watchUserLocation } from 'location'
import { platformIsWebBrowser } from 'utils'

import AppRoutes from './AppRoutes'
import WebSplashScreen from './WebSplashScreen'

import 'worker'
import 'tasks/index'

import 'styles'

const splashTimeout = Number(process.env.REACT_APP_SPLASH_TIMEOUT) || 500

const pageTransitionStyle = (
  splashScreenRendered: boolean
): Record<string, unknown> => ({
  visibility: splashScreenRendered ? 'hidden' : 'visible',
  opacity: splashScreenRendered ? 0 : 1,
  transition: 'opacity .8s',
})

const RootAppView: React.FC = () => {
  const [renderSplashScreen, setRenderSplashScreen] =
    useState(platformIsWebBrowser)

  const hideSpashScreen = () => {
    setRenderSplashScreen(false)
  }

  useEffect(() => {
    platformIsWebBrowser && setTimeout(hideSpashScreen, splashTimeout)
    if (sessionAvailable()) {
      return watchUserLocation().unsubscribe
    }
  }, [])

  return (
    <IonApp>
      {
        <React.Fragment>
          {renderSplashScreen ? (
            <WebSplashScreen />
          ) : (
            <React.Fragment>
              <Progress />
              <Toast />
            </React.Fragment>
          )}
          <div style={pageTransitionStyle(renderSplashScreen)}>
            <AppRoutes />
          </div>
        </React.Fragment>
      }
    </IonApp>
  )
}

export default RootAppView
