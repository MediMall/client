import React from 'react'
import Routes, { getDefaultRoute } from 'routes'
import { History } from 'history'

import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as constants from 'reducers/constants'

import { IonContent, IonPage, IonButton, IonList, IonItem, IonItemDivider, IonLabel, IonIcon } from '@ionic/react'
import { chevronDown as down, chevronUp as up, person } from 'ionicons/icons'

import { Header, ItemRequest } from 'components'
import { ItemSearch as SearchPopover, Select as SelectPopover } from 'containers'

import {
  ItemSearchResult as ItemSearchResultInterface,
  ItemRequest as ItemRequestInterface,
  Courier as CourierInterface
} from 'types'

import Requests, { endPoints } from 'requests'

import eventsInstance, { name as localEventName } from '../events'

import { userIsAdmin } from 'utils/role'

export type Props = {
  history: History,
  location: {
    state: { fetchRequests: boolean }, pathname: string
  },
  showLoading: () => {},
  hideLoading: () => {},
  showToast: (e: string) => {},
  hideToast: () => {},
}

const primaryAction = 'Action' // 'Request for Items'
const placeholderText = 'Lorem ipsum requests lorem ipsum'

const archivedRequestStates: Array<String> = ['cancelled', 'received']

class Component extends React.Component<Props> {

  state = {
    requests: undefined,
    searchPopoverShown: false,
    courierPopoverShown: false,
    requestDetailed: null,
    requestsSelected: [] as Array<String>,
    archivedRequestsShown: false,
    couriers: undefined
  }

  defaultUpdateRequestBody = () => ({
    'item-requests': this.state.requestsSelected
  })

  toolbarActions = () => {
    const { history, showLoading, hideLoading, showToast } = this.props
    const { requestsSelected } = this.state

    const defaultToolbarActions = [{
      icon: person,
      handler: () => history.push(Routes.account.path)
    }]

    if (requestsSelected.length > 0) {

      const updateBackend = (body: Object) => {
        showLoading()
        Requests.put(endPoints['item-requests'], {
          ...this.defaultUpdateRequestBody(),
          update: body
        }).then(this.updateRequests).catch(err => {
          console.error(err)
          showToast(err.error || err.toString())
        }).finally(hideLoading)
      }

      switch (window.location.pathname) {
        case Routes.home.path: return [{
          text: 'Mark as Received',
          handler: () => {
            updateBackend({ state: 5 }) // received
          }
        }, {
          text: 'Cancel',
          handler: () => {
            updateBackend({ state: 3 }) // cancelled
          }
        }]
        case Routes.courier.path: return [{
          text: 'Mark as Delivered',
          handler: () => {
            updateBackend({ state: 4 }) // delivered
          }
        }]
        case Routes.admin.path: return [{
          text: 'Assign to Courier',
          handler: this.onAssignCourier
        }]
        default: return defaultToolbarActions
      }

    } else {
      return defaultToolbarActions
    }

  }

  /**
   * Reponse ("response"), a result of item request updates from either
   * Axios requests by current user
   * Or events from other user
   * 
   * */
  updateRequests = (response: any) => {
    const { showToast, hideToast } = this.props
    const { requests = [] as Array<ItemRequestInterface> } = this.state
    response.forEach((request: ItemRequestInterface) => {
      const index = requests.findIndex(o => o._id === request._id)
      requests[index] = {
        ...requests[index], ...request
      }
    })
    hideToast()
    this.setState({ requests, requestsSelected: [] }, () => {
      const requestsArchived = response.filter(
        ({ state }: ItemRequestInterface) => archivedRequestStates.includes(state)
      )
      if (requestsArchived.length) setTimeout(() => {
        showToast(`${requestsArchived.length} ${
          requestsArchived.length > 1 ? 'requests' : 'request'
        } archived`)
      }, 400)
    })
  }

  onPrimaryAction = () => {
    this.setState({ searchPopoverShown: true })
  }

  onSelectedItemsReturned = (selectedItems: ItemSearchResultInterface) => {
    this.setState({ searchPopoverShown: false }, () => {
      this.props.history.replace(Routes.order.path, { selectedItems })
    })
  }

  onSearchPopoverDismiss = () => {
    this.setState({ searchPopoverShown: false })
  }

  onRequestTapped = (position: Number, request: String) => {
    const { requestDetailed, requestsSelected } = this.state
    if (position > 0) {
      this.setState({ requestDetailed: request === requestDetailed ? null : request })
    } else {
      const index = requestsSelected.indexOf(request)
      if (index < 0) {
        requestsSelected.push(request)
      } else
        requestsSelected.splice(index, 1)
      this.setState({ requestsSelected })
    }
  }

  onAssignCourier = () => {
    this.setState({ courierPopoverShown: true })
  }

  onCourierSelected = (courier: string) => {
    this.setState({ courierPopoverShown: false }, () => {
      const { showLoading, hideLoading, showToast } = this.props
      showLoading()
      Requests.put(endPoints['item-requests'], {
        ...this.defaultUpdateRequestBody(),
        update: { courier, state: 2 }
      }).then(this.updateRequests).catch(err => {
        console.error(err)
        showToast(err.error || err.toString())
      }).finally(hideLoading)
    })
  }

  onCourierPopoverDismiss = () => {
    this.setState({ courierPopoverShown: false })
  }

  onArchives = () => {
    const { archivedRequestsShown } = this.state
    this.setState({ archivedRequestsShown: !archivedRequestsShown })
  }

  getActiveRequests = (requests: Array<ItemRequestInterface>) => (
    requests.filter(({ state }) => archivedRequestStates.indexOf(state) < 0)
  )

  getArchivedRequests = (requests: Array<ItemRequestInterface>) => (
    requests.filter(({ state }) => archivedRequestStates.indexOf(state) > -1)
  )

  fetchRequests() {
    const { showLoading, hideLoading, showToast } = this.props
    showLoading()
    Requests.get(endPoints['item-requests']).then((response: any) => {
      this.setState({ requests: response })
    }).catch(err => {
      console.error(err)
      showToast(err.error || err.toString())
    }).finally(hideLoading)
  }

  fetchCouriers() {
    const { showToast } = this.props
    Requests.get(endPoints['couriers']).then((response: any) => {
      this.setState({
        couriers: response.map((o: CourierInterface) => ({
          label: o.name,
          value: o._id
        }))
      })
    }).catch(err => {
      console.error(err)
      showToast(err.error || err.toString())
    })
  }

  componentDidMount() {
    const defaultRoute = getDefaultRoute()
    if (this.props.location.pathname !== defaultRoute) {
      window.location.replace(defaultRoute)
      return
    }
    // this.onPrimaryAction()
    this.fetchRequests()
    if (userIsAdmin()) this.fetchCouriers()
    if (eventsInstance.listenerCount(localEventName) === 0)
      eventsInstance.on(localEventName, this.updateRequests)
  }

  render() {
    const {
      searchPopoverShown,
      courierPopoverShown,
      requests = [],
      requests: requestsReturned,
      requestDetailed,
      requestsSelected,
      archivedRequestsShown,
      couriers = [],
    } = this.state

    const activeRequests = this.getActiveRequests(requests)
    const archivedRequests = this.getArchivedRequests(requests)

    const selectModeOn = requestsSelected.length > 0

    const requestComponent = (item: any, i: number, a: Array<ItemRequestInterface>) => (
      <div key={item._id}>
        <IonItem
          button
          onClick={() => this.onRequestTapped(1, item._id)}
          className={`request ${selectModeOn ? 'select-mode' : ''} ion-no-padding`}
          style={{ paddingTop: 0, paddingBottom: 0 }}
        >
          <ItemRequest
            item={item}
            detailed={item._id === requestDetailed}
            selected={requestsSelected.includes(item._id)}
            selectMode={selectModeOn}
            onTap={this.onRequestTapped} />
        </IonItem>
        {i === a.length - 1 ? null : <IonItemDivider style={{ minHeight: 0 }} />}
      </div>
    )

    return (
      <IonPage>
        <Header omitsBack title="Requests" actions={this.toolbarActions()} />
        <IonContent>{
          requests.length ? <IonList
            style={{ paddingTop: 0, paddingBottom: 0 }}
            lines="none"
          >
            {activeRequests.map(requestComponent)}
            {archivedRequests.length ? <IonItem
              button
              onClick={this.onArchives}
              className="ion-item-archive"
              lines="none"
            >
              <IonLabel className="ion-no-margin ion-text-center">
                <p>Archived</p>
              </IonLabel>
              <IonIcon className="ion-no-margin" icon={
                archivedRequestsShown ? up : down
              } slot="end"></IonIcon>
            </IonItem> : null}
            {archivedRequestsShown ? archivedRequests.map(requestComponent) : null}
          </IonList> : <div className="ion-padding">{
            placeholderText
          }</div>}
          {requestsReturned ? <div className="ion-padding">
            <IonButton onClick={this.onPrimaryAction} className="ion-no-margin">{primaryAction}</IonButton>
          </div> : null}
          <SearchPopover
            open={searchPopoverShown}
            onDismiss={this.onSearchPopoverDismiss}
            onSubmit={this.onSelectedItemsReturned}
          />
          <SelectPopover
            open={courierPopoverShown}
            items={couriers}
            onDismiss={this.onCourierPopoverDismiss}
            onSelect={this.onCourierSelected}
          />
        </IonContent>
      </IonPage>
    )
  }

}

const mapDispatchToProps = (dispatch: any) => bindActionCreators({
  showLoading: () => ({
    type: constants.SHOW_LOADING
  }),
  hideLoading: () => ({
    type: constants.HIDE_LOADING
  }),
  showToast: (payload: string) => ({
    type: constants.SHOW_TOAST,
    payload
  }),
  hideToast: () => ({
    type: constants.HIDE_TOAST
  })
}, dispatch)

export default connect(null, mapDispatchToProps)(Component)
